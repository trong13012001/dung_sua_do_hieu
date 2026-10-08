'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MapPin, Phone, Receipt, Search, ShoppingBag, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useGetCustomerOrdersPage } from '@/hooks/customer/useGetCustomerOrdersPage';
import { useGetCustomerDetail } from '@/hooks/customer/useGetCustomerDetail';
import { CUSTOMER_ORDERS_PAGE_SIZE, getOrder, useDeleteOrder } from '@/api/orders';
import { useEmployees } from '@/api/users';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useDebounce } from '@/hooks/useDebounce';
import { Order } from '@/lib/types';
import { canPrintInvoice } from '@/lib/canPrintInvoice';
import { errorMessage } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import { OrderDetailModal } from '@/components/ui/OrderDetailModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CustomerOrdersPageSkeleton, OrderListSkeleton } from '@/components/ui/loading-skeletons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { EditOrderDialog } from '@/components/orders/EditOrderDialog';
import { InvoicePrintDialog, ItemLabelsPrintDialog } from '@/components/orders/OrderPrintDialogs';
import { CustomerOrderCard } from './_components/CustomerOrderCard';

function InfoRow({ icon: Icon, label, value }: { icon: typeof UserIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function CustomerOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserId = useCurrentUserId();
  const customerId = params.id as string;
  const { data: employees } = useEmployees();
  const { mutateAsync: deleteOrder, isPending: isDeletingOrder } = useDeleteOrder();
  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomerDetail(customerId);

  const selectedOrderId = searchParams.get('orderId');

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(CUSTOMER_ORDERS_PAGE_SIZE);

  const {
    data: ordersPage,
    isLoading: isLoadingOrders,
    isFetching: isFetchingOrders,
  } = useGetCustomerOrdersPage(customerId, page, debouncedSearch, pageSize);
  // Lọc (mã đơn, mã giao dịch, trạng thái, tên/mô tả sản phẩm) đã chạy ở phía DB.
  const orders = ordersPage?.data ?? [];
  const totalOrders = ordersPage?.count ?? 0;

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [labelLineIndices, setLabelLineIndices] = useState<number[] | null>(null);

  const tailors = useMemo(() => (employees ?? []).filter((e) => e.role?.name === 'Thợ may'), [employees]);

  const openDetail = useCallback(
    (orderId: number) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('orderId', orderId.toString());
      router.push(`?${next.toString()}`);
    },
    [router, searchParams],
  );

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('orderId');
    router.push(`?${next.toString()}`);
  };

  const printInvoice = useCallback(async (order: Order) => {
    setPrintingOrderId(order.id);
    try {
      const fresh = await getOrder(order.id);
      const check = canPrintInvoice(fresh);
      if (!check.ok) {
        toast.error(check.message);
        return;
      }
      setInvoiceOrder(fresh);
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    } finally {
      setPrintingOrderId(null);
    }
  }, []);

  const printLabels = useCallback((order: Order) => {
    setLabelOrder(order);
    setLabelLineIndices(null);
  }, []);

  const openEdit = useCallback((order: Order) => {
    setEditingOrder(order);
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }, []);

  const openDelete = useCallback((order: Order) => {
    setDeletingOrder(order);
    setDeleteOpen(true);
  }, []);

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    try {
      await deleteOrder({ id: deletingOrder.id, updated_by: currentUserId ?? undefined });
      if (invoiceOrder?.id === deletingOrder.id) setInvoiceOrder(null);
      setDeleteOpen(false);
      toast.success('Xóa đơn hàng thành công');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const closeLabels = () => {
    setLabelOrder(null);
    setLabelLineIndices(null);
  };

  if (isLoadingCustomer) {
    return <CustomerOrdersPageSkeleton />;
  }

  const searching = debouncedSearch.trim() !== '';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Về danh sách khách hàng">
            <Link href="/customers">
              <ChevronLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground md:text-xl">Lịch sử đơn hàng</h1>
            <p className="text-xs text-muted-foreground md:text-sm">
              Khách hàng: <span className="font-bold text-primary">{customer?.name}</span>
            </p>
          </div>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-1.5 text-success md:px-4 md:py-2">
          <Receipt size={16} />
          <span className="text-xs font-bold uppercase tracking-wider md:text-sm">
            {searching ? 'Kết quả: ' : 'Tổng đơn: '}
            {totalOrders}
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          type="search"
          placeholder="Tìm mã đơn, sản phẩm, trạng thái..."
          className="h-10 bg-card pl-10"
          value={searchTerm}
          onChange={(e) => {
            // Tìm kiếm chạy ở phía DB nên phải quay về trang 1 mỗi khi đổi từ khoá.
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="h-fit gap-4 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <UserIcon size={14} /> Thông tin khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <InfoRow icon={UserIcon} label="Họ tên" value={customer?.name ?? ''} />
            <InfoRow icon={Phone} label="Số điện thoại" value={customer?.phone || 'N/A'} />
            <InfoRow icon={MapPin} label="Địa chỉ" value={customer?.address || 'N/A'} />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {isLoadingOrders ? (
            <OrderListSkeleton rows={4} />
          ) : orders.length > 0 ? (
            orders.map((order) => (
              <CustomerOrderCard
                key={order.id}
                order={order}
                printing={printingOrderId === order.id}
                onOpen={openDetail}
                onPrintInvoice={printInvoice}
                onPrintLabels={printLabels}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))
          ) : searching ? (
            <EmptyState icon={Search} title="Không tìm thấy đơn phù hợp với từ khóa." />
          ) : (
            <EmptyState icon={ShoppingBag} title="Không tìm thấy đơn hàng nào cho khách hàng này." />
          )}

          <Pagination
            page={page}
            totalCount={totalOrders}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            isFetching={isFetchingOrders}
            unitLabel="đơn"
            className="pt-2"
          />
        </div>
      </div>

      <EditOrderDialog
        key={editKey}
        open={editOpen}
        onOpenChange={setEditOpen}
        order={editingOrder}
        tailors={tailors}
        currentUserId={currentUserId}
        withReturnDate
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa đơn hàng"
        description={
          <>
            Bạn có chắc chắn muốn xóa đơn hàng <span className="font-bold text-foreground">#{deletingOrder?.id}</span>?
          </>
        }
        confirmLabel="Xóa vĩnh viễn"
        pendingLabel="Đang xóa..."
        cancelLabel="Giữ lại"
        destructive
        isPending={isDeletingOrder}
        onConfirm={handleDeleteOrder}
      />

      <InvoicePrintDialog order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      <ItemLabelsPrintDialog order={labelOrder} lineIndices1Based={labelLineIndices} onClose={closeLabels} />

      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={closeDetail}
        orderId={selectedOrderId}
        onPrintItemBarcode={(order, lineIndex1Based) => {
          setLabelOrder(order);
          setLabelLineIndices([lineIndex1Based]);
        }}
      />
    </div>
  );
}
