'use client';

import React, { useCallback, useState } from 'react';
import {
  Search,
  PackageCheck,
  CheckCircle2,
  Clock,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import {
  RETURNS_PAGE_SIZE,
  useReturnsCounts,
  useReturnsDueCounts,
  useReturnsOrders,
  type ReturnTimeRange,
  useUpdateOrder,
} from '@/api/orders';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderListSkeleton } from '@/components/ui/loading-skeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { Order } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
import {
  ORDER_STATUSES_ALLOW_COUNTER_DELIVERY,
  resolveStatusWhenMarkingDelivered,
} from '@/lib/orderStatusUi';
import { vnDayStartIso, vnNextDayStartIso, vnYmd } from '@/lib/vnDate';
import { ReturnOrderCard, type ReturnsTab } from './_components/ReturnOrderCard';
import { DeliverOrderDialog } from '@/components/orders/DeliverOrderDialog';

const EMPTY_TEXT: Record<ReturnsTab, string> = {
  dueToday: 'Hôm nay không có đơn nào hẹn trả.',
  overdue: 'Không có đơn nào quá hạn trả.',
  ready: 'Không có đơn nào chờ trả đồ.',
  delivered: 'Chưa có đơn nào đã trả.',
};

const DELIVERED_STATUSES = ['Delivered', 'DeliveredOwing'] as const;

const RETURNS_TABS: readonly ReturnsTab[] = ['dueToday', 'overdue', 'ready', 'delivered'];

function parseReturnsTab(raw: string | null): ReturnsTab {
  return RETURNS_TABS.includes(raw as ReturnsTab) ? (raw as ReturnsTab) : 'ready';
}

export default function ReturnsPage() {
  const {
    mutateAsync: mutateAsyncUpdateOrder,
    isPending: isPendingUpdateOrder,
  } = useUpdateOrder();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  // `?tab=dueToday|overdue` — thẻ trên Dashboard mở thẳng tab tương ứng.
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ReturnsTab>(() => parseReturnsTab(searchParams.get('tab')));
  const [returnOpen, setReturnOpen] = useState(false);
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(RETURNS_PAGE_SIZE);

  // Lọc theo trạng thái + tìm kiếm chạy ở phía DB. Lọc ở client như trước sẽ chỉ
  // thấy 100 đơn mới nhất, khách mang phiếu cũ tới lấy đồ là không tra ra.
  // Ngày hẹn so theo giờ VN; tính lại mỗi lần render nên qua nửa đêm key tự đổi.
  const todayYmd = vnYmd();
  const returnTimeRange: ReturnTimeRange | undefined =
    tab === 'dueToday'
      ? { gte: vnDayStartIso(todayYmd), lt: vnNextDayStartIso(todayYmd) }
      : tab === 'overdue'
        ? { lt: vnDayStartIso(todayYmd) }
        : undefined;
  const { data: ordersPage, isLoading, isFetching } = useReturnsOrders(
    tab === 'delivered' ? DELIVERED_STATUSES : ORDER_STATUSES_ALLOW_COUNTER_DELIVERY,
    debouncedSearch,
    page,
    pageSize,
    returnTimeRange,
  );
  const orders = ordersPage?.data;
  const matchedCount = ordersPage?.count ?? 0;


  const { data: counts } = useReturnsCounts(
    ORDER_STATUSES_ALLOW_COUNTER_DELIVERY,
    DELIVERED_STATUSES,
  );
  const readyCount = counts?.ready ?? 0;
  const deliveredCount = counts?.delivered ?? 0;

  const { data: dueCounts } = useReturnsDueCounts(
    ORDER_STATUSES_ALLOW_COUNTER_DELIVERY,
    todayYmd,
  );
  const dueTodayCount = dueCounts?.dueToday ?? 0;
  const overdueCount = dueCounts?.overdue ?? 0;

  const changeTab = (next: ReturnsTab) => {
    setTab(next);
    setPage(1);
  };

  const displayedOrders = orders || [];

  const openReturn = useCallback((order: Order) => {
    setReturningOrder(order);
    setReturnOpen(true);
  }, []);

  const handleReturn = async () => {
    if (!returningOrder) return;
    try {
      const status = resolveStatusWhenMarkingDelivered(returningOrder);
      const id = returningOrder.id;
      await mutateAsyncUpdateOrder({
        id,
        order: {
          status,
          return_time: new Date().toISOString(),
        },
      });
      setReturnOpen(false);
      toast.success(
        status === 'DeliveredOwing'
          ? `Đã trả đồ đơn #${id} — Trạng thái: Trả thiếu tiền.`
          : `Đã trả đồ đơn #${id} thành công.`,
      );
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trả đồ cho khách"
        actions={
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="rounded-md bg-success/10 px-2.5 py-1 text-success">Chờ trả: {readyCount}</span>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-primary">Đã trả: {deliveredCount}</span>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => changeTab(v as ReturnsTab)}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="dueToday" className="flex-none">
            <CalendarClock /> Hẹn trả hôm nay ({dueTodayCount})
          </TabsTrigger>
          <TabsTrigger value="overdue" className={overdueCount > 0 ? 'flex-none text-destructive data-[state=active]:text-destructive' : 'flex-none'}>
            <AlertTriangle /> Quá hạn ({overdueCount})
          </TabsTrigger>
          <TabsTrigger value="ready" className="flex-none">
            <Clock /> Chờ trả ({readyCount})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex-none">
            <CheckCircle2 /> Đã trả ({deliveredCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          type="search"
          placeholder="Tìm mã đơn, tên hoặc SĐT khách..."
          className="h-10 bg-card pl-10"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {debouncedSearch.trim() !== '' && (
        <p className="text-xs italic text-muted-foreground">Tìm thấy {matchedCount} đơn khớp.</p>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <OrderListSkeleton rows={4} />
        ) : displayedOrders.length > 0 ? (
          displayedOrders.map((order) => (
            <ReturnOrderCard key={order.id} order={order} tab={tab} onReturn={openReturn} />
          ))
        ) : (
          <EmptyState icon={PackageCheck} title={EMPTY_TEXT[tab]} />
        )}

        <Pagination
          page={page}
          totalCount={matchedCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          isFetching={isFetching}
          unitLabel="đơn"
          className="pt-2"
        />
      </div>

      <DeliverOrderDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        order={returningOrder}
        isPending={isPendingUpdateOrder}
        onConfirm={handleReturn}
      />
    </div>
  );
}
