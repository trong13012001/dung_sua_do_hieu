'use client';

import { memo } from 'react';
import { Calendar, ChevronRight, Clock, ShoppingBag } from 'lucide-react';
import { useGetCustomerOrders } from '@/hooks/customer/useGetCustomerOrders';
import type { Customer, Order } from '@/lib/types';
import { formatVnd } from '@/lib/format';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OrderListSkeleton } from '@/components/ui/loading-skeletons';
import { EmptyState } from '@/components/common/EmptyState';

const HistoryOrderItem = memo(function HistoryOrderItem({
  order,
  onOpen,
}: {
  order: Order;
  onOpen: (orderId: number) => void;
}) {
  const received = new Date(order.receive_time);
  return (
    <button
      type="button"
      onClick={() => onOpen(order.id)}
      className="group w-full rounded-xl border border-border bg-card p-4 text-left shadow-xs transition-shadow outline-none hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground">#{order.id}</span>
              <StatusBadge status={order.status} className="text-[10px] uppercase tracking-wider" />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Calendar size={12} className="text-primary" />
                {received.toLocaleDateString('vi-VN')}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Clock size={12} className="text-primary" />
                {received.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-2 sm:border-none sm:pt-0">
          <p className="text-base font-black text-foreground">{formatVnd(order.total_amount)}</p>
          <ChevronRight size={18} className="text-primary opacity-70 group-hover:opacity-100" />
        </div>
      </div>
    </button>
  );
});

/** Lịch sử đơn của khách đang chọn ở POS. Chỉ tải khi mở. */
export function CustomerHistoryDialog({
  open,
  onOpenChange,
  customer,
  onOpenOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onOpenOrder: (orderId: number) => void;
}) {
  const { data: orders, isLoading } = useGetCustomerOrders(customer?.id ?? '', {
    enabled: Boolean(customer?.id && open),
  });

  return (
    <Dialog open={open && !!customer} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Lịch sử đơn hàng — {customer?.name}</DialogTitle>
          <DialogDescription>
            Chọn một đơn để xem chi tiết. Số điện thoại:{' '}
            <span className="font-medium text-foreground">{customer?.phone || 'N/A'}</span>
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <OrderListSkeleton rows={3} />
        ) : orders && orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order: Order) => (
              <HistoryOrderItem key={order.id} order={order} onOpen={onOpenOrder} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ShoppingBag} title="Chưa có đơn hàng nào cho khách này." />
        )}
      </DialogContent>
    </Dialog>
  );
}
