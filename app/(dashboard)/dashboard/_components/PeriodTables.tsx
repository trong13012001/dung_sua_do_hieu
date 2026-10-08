'use client';

import { memo, type ReactNode } from 'react';
import type { DashboardPeriodItemRow, DashboardPeriodOrderRow } from '@/lib/types';
import { formatVnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { orderCode, paymentMethodLabel, statusColor, statusLabel } from './dashboardLabels';

/*
 * Bảng chi tiết theo kỳ. Dùng <table> thường (không phải shadcn Table) vì tiêu đề phải dính
 * (sticky) trong khung cuộn dọc của chính bảng — Table của shadcn tự bọc một khung cuộn ngang riêng.
 */

const TH = 'px-4 py-3 whitespace-nowrap';
const TD = 'px-4 py-2.5';
const dateTime = (iso: string) => new Date(iso).toLocaleString('vi-VN');

function TableShell({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="sticky top-0 z-1 bg-muted text-[11px] font-bold uppercase text-muted-foreground">
        <tr>{head}</tr>
      </thead>
      <tbody className="divide-y divide-border">{children}</tbody>
    </table>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-xs italic leading-relaxed text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

function OrderLink({ id, onOpen, mono }: { id: number; onOpen: (id: number) => void; mono?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className={cn('rounded text-primary hover:underline', mono ? 'font-mono text-xs' : 'font-bold')}
    >
      {orderCode(id)}
    </button>
  );
}

/* ------------------------------ Hàng (món) ------------------------------ */

const ItemRow = memo(function ItemRow({
  row,
  time,
  onOpen,
}: {
  row: DashboardPeriodItemRow;
  time: string | null | undefined;
  onOpen: (id: number) => void;
}) {
  return (
    <tr className="hover:bg-muted/40">
      <td className={cn(TD, 'max-w-[200px] font-medium text-foreground')}>{row.item_name}</td>
      <td className={TD}>
        <OrderLink id={row.order_id} onOpen={onOpen} mono />
      </td>
      <td className={cn(TD, 'text-muted-foreground')}>{row.customer_name}</td>
      <td className={TD}>
        <StatusBadge kind="detail" status={row.status} className="rounded text-[10px]" />
      </td>
      <td className={cn(TD, 'whitespace-nowrap text-xs text-muted-foreground')}>{time ? dateTime(time) : '—'}</td>
    </tr>
  );
});

export const ItemsTable = memo(function ItemsTable({
  rows,
  timeHeader,
  timeField,
  empty,
  onOpen,
}: {
  rows: DashboardPeriodItemRow[];
  timeHeader: string;
  timeField: 'created_at' | 'return_time';
  empty: string;
  onOpen: (id: number) => void;
}) {
  return (
    <TableShell
      head={
        <>
          <th className={TH}>Hàng</th>
          <th className={TH}>Đơn</th>
          <th className={TH}>Khách</th>
          <th className={TH}>Trạng thái</th>
          <th className={TH}>{timeHeader}</th>
        </>
      }
    >
      {rows.length === 0 ? (
        <EmptyRow colSpan={5}>{empty}</EmptyRow>
      ) : (
        rows.map((row) => <ItemRow key={row.id} row={row} time={row[timeField]} onOpen={onOpen} />)
      )}
    </TableShell>
  );
});

/* -------------------------------- Đơn -------------------------------- */

export type OrdersTableVariant = 'created' | 'byStatus' | 'debt' | 'revenue' | 'returned';

const VARIANT: Record<OrdersTableVariant, { statusHeader: string; lastHeader: string; cols: number }> = {
  created: { statusHeader: 'Xử lý đơn', lastHeader: 'Tạo lúc', cols: 7 },
  byStatus: { statusHeader: 'Trạng thái', lastHeader: 'Tạo lúc', cols: 7 },
  debt: { statusHeader: 'Xử lý đơn', lastHeader: 'Tạo lúc', cols: 7 },
  revenue: { statusHeader: 'Trạng thái', lastHeader: 'Thu gần nhất (PTTT)', cols: 6 },
  returned: { statusHeader: 'Trạng thái', lastHeader: 'Trả lúc', cols: 5 },
};

const OrderRow = memo(function OrderRow({
  o,
  variant,
  onOpen,
}: {
  o: DashboardPeriodOrderRow;
  variant: OrdersTableVariant;
  onOpen: (id: number) => void;
}) {
  const money = cn(TD, 'text-right tabular-nums');
  return (
    <tr className="hover:bg-muted/40">
      <td className={TD}>
        <OrderLink id={o.id} onOpen={onOpen} />
      </td>
      <td className={cn(TD, 'text-muted-foreground')}>{o.customer_name}</td>
      <td className={TD}>
        <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold', statusColor(o.status))}>
          {statusLabel(o.status)}
        </span>
      </td>
      <td className={cn(money, 'font-medium')}>{formatVnd(o.total_amount)}</td>

      {variant === 'revenue' && (
        <>
          <td className={cn(money, 'font-semibold text-success')}>{formatVnd(o.paid_amount)}</td>
          <td className={cn(TD, 'whitespace-nowrap text-xs text-muted-foreground')}>
            {dateTime(o.created_at)}
            <span className="ml-1">({paymentMethodLabel(o.payment_method)})</span>
          </td>
        </>
      )}

      {variant === 'returned' && (
        <td className={cn(TD, 'whitespace-nowrap text-xs text-muted-foreground')}>
          {o.return_time ? dateTime(o.return_time) : '—'}
        </td>
      )}

      {(variant === 'created' || variant === 'byStatus' || variant === 'debt') && (
        <>
          <td className={cn(money, 'text-muted-foreground')}>{formatVnd(o.paid_amount)}</td>
          <td
            className={cn(
              money,
              variant === 'debt'
                ? 'font-bold text-warning'
                : o.unpaid_amount > 0
                  ? 'font-semibold text-warning'
                  : 'font-semibold text-muted-foreground',
            )}
          >
            {formatVnd(o.unpaid_amount)}
          </td>
          <td className={cn(TD, 'whitespace-nowrap text-xs text-muted-foreground')}>{dateTime(o.created_at)}</td>
        </>
      )}
    </tr>
  );
});

export const OrdersTable = memo(function OrdersTable({
  rows,
  variant,
  empty,
  onOpen,
}: {
  rows: DashboardPeriodOrderRow[];
  variant: OrdersTableVariant;
  empty: ReactNode;
  onOpen: (id: number) => void;
}) {
  const v = VARIANT[variant];
  return (
    <TableShell
      head={
        <>
          <th className={TH}>Mã đơn</th>
          <th className={TH}>Khách</th>
          <th className={TH}>{v.statusHeader}</th>
          <th className={cn(TH, 'text-right')}>Tổng tiền</th>
          {variant === 'revenue' && <th className={cn(TH, 'text-right')}>Thu trong kỳ</th>}
          {(variant === 'created' || variant === 'byStatus' || variant === 'debt') && (
            <>
              <th className={cn(TH, 'text-right')}>Đã thu</th>
              <th className={cn(TH, 'text-right')}>Còn nợ</th>
            </>
          )}
          <th className={TH}>{v.lastHeader}</th>
        </>
      }
    >
      {rows.length === 0 ? (
        <EmptyRow colSpan={v.cols}>{empty}</EmptyRow>
      ) : (
        rows.map((o) => <OrderRow key={o.id} o={o} variant={variant} onOpen={onOpen} />)
      )}
    </TableShell>
  );
});

/** Ghi chú dưới bảng. */
export function TableNote({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-border bg-muted/40 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
      <span className="font-semibold text-foreground">Ghi chú:</span> {children}
    </p>
  );
}
