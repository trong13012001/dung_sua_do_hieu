'use client';

import { memo, useMemo, useState } from 'react';
import { CalendarDays, DollarSign, Package, PackageCheck, Scale, Shirt, ShoppingBag, type LucideIcon } from 'lucide-react';
import { useDashboardPeriodAnalytics } from '@/api/stats';
import type { DashboardPeriodAnalytics, DashboardPeriodMode } from '@/lib/types';
import { ORDER_STATUS_FILTER_SEQUENCE } from '@/lib/orderStatusUi';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BlockSkeleton, StatGridSkeleton } from '@/components/ui/loading-skeletons';
import { currentYM, periodLabelVi, statusColor, statusLabel, todayYMD } from './dashboardLabels';
import { ItemsTable, OrdersTable, TableNote } from './PeriodTables';

type PeriodListTab =
  | 'ordersCreated'
  | 'ordersRevenue'
  | 'ordersByStatus'
  | 'ordersDebt'
  | 'ordersReturned'
  | 'itemsCreated'
  | 'itemsReturned';

const MODES: readonly [DashboardPeriodMode, string][] = [
  ['day', 'Ngày'],
  ['month', 'Tháng'],
  ['year', 'Năm'],
];

const StatTile = memo(function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'primary' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border p-3 md:p-4',
        tone === 'primary' ? 'bg-primary/5' : tone === 'warning' ? 'bg-warning/5' : 'bg-muted/30',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon size={14} className={tone === 'primary' ? 'text-primary' : tone === 'warning' ? 'text-warning' : undefined} />
        {label}
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-bold tabular-nums md:text-3xl',
          tone === 'primary' ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
});

/** Chip chọn tab / lọc. */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function tabsOf(d: DashboardPeriodAnalytics): [PeriodListTab, string, number][] {
  return [
    ['itemsCreated', 'Hàng mới tạo', d.itemsCreated.length],
    ['itemsReturned', 'Hàng đã trả', d.itemsReturned.length],
    ['ordersCreated', 'Đơn tạo (chi tiết)', d.ordersCreated.length],
    ['ordersRevenue', 'Đơn ghi nhận doanh thu', d.ordersRevenue.length],
    ['ordersByStatus', 'Đơn theo trạng thái', d.ordersCreatedCount],
    ['ordersDebt', 'Công nợ đơn trong kỳ', d.ordersDebt.length],
    ['ordersReturned', 'Đơn đã trả (chi tiết)', d.ordersReturned.length],
  ];
}

/** Phân tích theo ngày / tháng / năm. Giữ state riêng — đổi kỳ không render lại phần còn lại của dashboard. */
export function PeriodAnalytics({ onOpenOrder }: { onOpenOrder: (orderId: number) => void }) {
  const [mode, setMode] = useState<DashboardPeriodMode>('day');
  const [dayValue, setDayValue] = useState(todayYMD);
  const [monthValue, setMonthValue] = useState(currentYM);
  const [yearValue, setYearValue] = useState(() => String(new Date().getFullYear()));
  const [listTab, setListTab] = useState<PeriodListTab>('itemsCreated');
  const [statusFilter, setStatusFilter] = useState('all');

  const selection = useMemo(
    () => ({ mode, value: mode === 'day' ? dayValue : mode === 'month' ? monthValue : yearValue }),
    [mode, dayValue, monthValue, yearValue],
  );
  const { data, isLoading, isError } = useDashboardPeriodAnalytics(selection);

  // Đổi kỳ thì bỏ bộ lọc trạng thái — làm ngay trong handler (trước đây là useEffect + setState).
  const changeMode = (m: DashboardPeriodMode) => {
    setMode(m);
    if (m === 'month') setMonthValue(dayValue.slice(0, 7));
    if (m === 'year') setYearValue(dayValue.slice(0, 4));
    setStatusFilter('all');
  };
  const changeValue = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setStatusFilter('all');
  };

  const ordersForStatusTab = useMemo(() => {
    if (!data) return [];
    return statusFilter === 'all' ? data.ordersCreated : data.ordersCreated.filter((o) => o.status === statusFilter);
  }, [data, statusFilter]);

  const statusTabEmpty = () => {
    if (!data || data.ordersCreatedCount === 0) return 'Không có đơn nào được tạo trong kỳ này.';
    const total = statusFilter === 'all' ? 0 : data.ordersCreatedStatusCounts[statusFilter] ?? 0;
    if (total > 0) {
      return (
        <>
          Trong kỳ có <span className="font-semibold not-italic text-foreground">{total}</span> đơn ở trạng thái &quot;
          {statusLabel(statusFilter)}&quot;; danh sách tối đa 300 đơn mới nhất hiện không có dòng khớp.
        </>
      );
    }
    return 'Không có đơn nào khớp bộ lọc.';
  };

  return (
    <Card className="gap-4 p-4 md:gap-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground md:text-lg">
            <CalendarDays size={20} className="shrink-0 text-primary" />
            Phân tích theo kỳ
          </h2>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            Đơn tạo theo <span className="text-foreground/80">ngày lập đơn</span>
            {' · '}Đơn trả và hàng trả theo <span className="text-foreground/80">thời điểm khách nhận (trả đồ)</span>
            {' · '}Doanh thu theo <span className="text-foreground/80">các khoản thanh toán phát sinh trong kỳ</span>
            {' · '}Công nợ là <span className="text-foreground/80">dư chưa thu trên đơn lập trong kỳ</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {MODES.map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'day' && (
            <Input type="date" aria-label="Chọn ngày" className="w-auto" value={dayValue} onChange={changeValue(setDayValue)} />
          )}
          {mode === 'month' && (
            <Input type="month" aria-label="Chọn tháng" className="w-auto" value={monthValue} onChange={changeValue(setMonthValue)} />
          )}
          {mode === 'year' && (
            <Input
              type="number"
              aria-label="Chọn năm"
              min={2000}
              max={2100}
              className="w-[100px]"
              value={yearValue}
              onChange={changeValue(setYearValue)}
            />
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-foreground">
        Đang xem: <span className="text-primary">{periodLabelVi(selection.mode, selection.value)}</span>
      </p>

      {isLoading ? (
        <div className="space-y-4">
          <StatGridSkeleton count={4} />
          <BlockSkeleton className="h-56" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-destructive">Không tải được số liệu theo kỳ. Vui lòng thử lại.</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
            <StatTile icon={ShoppingBag} label="Đơn tạo" value={data.ordersCreatedCount} />
            <StatTile icon={PackageCheck} label="Đơn đã trả" value={data.ordersReturnedCount} />
            <StatTile icon={Shirt} label="Hàng tạo" value={data.itemsCreatedCount} hint="Dòng hàng mới trong kỳ" />
            <StatTile icon={Package} label="Hàng đã trả" value={data.itemsReturnedCount} hint="Theo đơn trả trong kỳ" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
            <StatTile
              icon={DollarSign}
              tone="primary"
              label="Doanh thu trong kỳ"
              value={`${formatNumber(Math.round(data.periodRevenue))}đ`}
              hint="Tổng tiền thu thực tế trong kỳ theo thời gian thanh toán (kể cả đơn lập từ kỳ trước)"
            />
            <StatTile
              icon={Scale}
              tone="warning"
              label="Công nợ đơn trong kỳ"
              value={`${formatNumber(Math.round(data.periodUnpaidOnOrdersCreated))}đ`}
              hint="Tổng (tổng tiền − đã thu) trên đơn được lập trong kỳ, chỉ cộng phần còn nợ"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
            {tabsOf(data).map(([key, label, n]) => (
              <Chip key={key} active={listTab === key} onClick={() => setListTab(key)}>
                {label}
                <span className="tabular-nums opacity-70">({n})</span>
              </Chip>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            {listTab === 'ordersByStatus' && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-2.5">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Lọc</span>
                <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                  Tất cả <span className="tabular-nums opacity-70">({data.ordersCreatedCount})</span>
                </Chip>
                {ORDER_STATUS_FILTER_SEQUENCE.map((st) => (
                  <Chip key={st} active={statusFilter === st} onClick={() => setStatusFilter(st)}>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', statusColor(st))}>
                      {statusLabel(st)}
                    </span>
                    <span className="text-[10px] tabular-nums opacity-80">({data.ordersCreatedStatusCounts[st] ?? 0})</span>
                  </Chip>
                ))}
              </div>
            )}
            <div className="custom-scrollbar max-h-[min(420px,55vh)] overflow-auto">
              {listTab === 'itemsCreated' && (
                <ItemsTable
                  rows={data.itemsCreated}
                  timeHeader="Tạo lúc"
                  timeField="created_at"
                  empty="Không có hàng nào được tạo trong kỳ này."
                  onOpen={onOpenOrder}
                />
              )}
              {listTab === 'itemsReturned' && (
                <ItemsTable
                  rows={data.itemsReturned}
                  timeHeader="Trả lúc"
                  timeField="return_time"
                  empty="Không có hàng nào thuộc đơn đã trả trong kỳ này."
                  onOpen={onOpenOrder}
                />
              )}
              {listTab === 'ordersCreated' && (
                <OrdersTable
                  rows={data.ordersCreated}
                  variant="created"
                  empty="Không có đơn nào được tạo trong kỳ này."
                  onOpen={onOpenOrder}
                />
              )}
              {listTab === 'ordersByStatus' && (
                <OrdersTable rows={ordersForStatusTab} variant="byStatus" empty={statusTabEmpty()} onOpen={onOpenOrder} />
              )}
              {listTab === 'ordersRevenue' && (
                <OrdersTable
                  rows={data.ordersRevenue}
                  variant="revenue"
                  empty="Không có đơn phát sinh thu tiền trong kỳ này."
                  onOpen={onOpenOrder}
                />
              )}
              {listTab === 'ordersReturned' && (
                <OrdersTable
                  rows={data.ordersReturned}
                  variant="returned"
                  empty="Không có đơn nào được đánh dấu trả trong kỳ này."
                  onOpen={onOpenOrder}
                />
              )}
              {listTab === 'ordersDebt' && (
                <OrdersTable
                  rows={data.ordersDebt}
                  variant="debt"
                  empty="Không có đơn nợ nào được tạo trong kỳ này."
                  onOpen={onOpenOrder}
                />
              )}
            </div>
            {listTab === 'ordersCreated' && (
              <TableNote>
                Cột &quot;Xử lý đơn&quot;: trạng thái đơn trên hệ thống. &quot;Đã thanh toán&quot; = đã thu đủ tiền (tự
                động khi thanh toán đủ). &quot;Đã xong&quot; = hàng xong chờ trả; &quot;Đã giao&quot; = đã trả đồ.
              </TableNote>
            )}
            {listTab === 'ordersByStatus' && (
              <TableNote>
                Số trên chip là tổng đơn <strong>lập trong kỳ</strong> theo từng trạng thái (đếm đủ). Bảng hiển thị tối
                đa <strong>300</strong> đơn mới nhất trong kỳ, lọc theo chip.
              </TableNote>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Số đếm là đủ cho toàn bộ kỳ. Bảng chỉ hiển thị tối đa 300 đơn tạo, 150 đơn trả gần nhất và 200 hàng mới tạo /
            400 hàng trong các đơn trả (theo thứ tự thời gian).
          </p>
        </>
      ) : null}
    </Card>
  );
}
