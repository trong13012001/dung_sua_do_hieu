'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRowsSkeleton, TableRowsSkeleton, TextLinesSkeleton } from '@/components/ui/loading-skeletons';
import { formatVnd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { orderCode, statusColor, statusLabel } from './dashboardLabels';

export type RecentOrder = {
  id: number;
  status: string;
  total_amount: number;
  created_at: string;
  customer: { name: string; phone: string | null } | null;
};

type Props = { orders: RecentOrder[] | undefined; isLoading: boolean };

function StatusChip({ status, small }: { status: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'rounded font-bold uppercase tracking-wider',
        small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        statusColor(status),
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

/** Dòng thời gian các đơn mới nhất. */
export const RecentActivity = memo(function RecentActivity({ orders, isLoading }: Props) {
  return (
    <Card className="gap-4 p-4 md:p-6">
      <h2 className="text-base font-bold text-foreground md:text-lg">Hoạt động gần đây</h2>
      <div className="custom-scrollbar max-h-[300px] space-y-5 overflow-y-auto pr-2">
        {isLoading ? (
          <TextLinesSkeleton lines={6} />
        ) : orders && orders.length > 0 ? (
          orders.slice(0, 8).map((order) => (
            <div key={order.id} className="relative flex gap-3">
              <div className="z-10 mt-1.5 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_4px_var(--card)]" />
              <div className="absolute bottom-0 left-1 top-3 w-px bg-border" />
              <div>
                <p className="text-sm font-bold text-foreground">
                  Đơn #{order.id} — {statusLabel(order.status)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{order.customer?.name || 'Vãng lai'}</p>
                <p className="mt-1 text-[11px] italic text-muted-foreground/70">
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm italic text-muted-foreground">Chưa có hoạt động</p>
        )}
      </div>
    </Card>
  );
});

/** 5 giao dịch gần nhất: bảng trên desktop, danh sách trên mobile. */
export const RecentTransactions = memo(function RecentTransactions({ orders, isLoading }: Props) {
  const rows = orders?.slice(0, 5) ?? [];
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b border-border p-4 md:p-6">
        <h2 className="text-base font-bold text-foreground md:text-lg">Giao dịch gần đây</h2>
        <Button size="sm" asChild>
          <Link href="/orders">Xem tất cả</Link>
        </Button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-4">Mã đơn</th>
              <th className="px-6 py-4">Khách hàng</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Số tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoading ? (
              <TableRowsSkeleton rows={5} cols={4} />
            ) : rows.length > 0 ? (
              rows.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4 font-bold text-primary">{orderCode(order.id)}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{order.customer?.name || 'Vãng lai'}</p>
                    <p className="text-xs text-muted-foreground">{order.customer?.phone || ''}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusChip status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-foreground">{formatVnd(order.total_amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center italic text-muted-foreground">
                  Không tìm thấy giao dịch nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {isLoading ? (
          <ListRowsSkeleton rows={4} />
        ) : rows.length > 0 ? (
          rows.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{orderCode(order.id)}</span>
                  <StatusChip status={order.status} small />
                </div>
                <p className="truncate text-xs text-muted-foreground">{order.customer?.name || 'Vãng lai'}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-foreground">{formatVnd(order.total_amount)}</p>
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm italic text-muted-foreground">Không tìm thấy giao dịch nào.</p>
        )}
      </div>
    </Card>
  );
});
