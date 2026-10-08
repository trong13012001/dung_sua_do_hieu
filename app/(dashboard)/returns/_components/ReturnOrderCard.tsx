'use client';

import { memo } from 'react';
import { AlertTriangle, Calendar, PackageCheck, Phone, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Order } from '@/lib/types';
import { canMarkOrderDeliveredAtCounter } from '@/lib/orderStatusUi';
import { formatVnDate, vnDaysUntilToday } from '@/lib/vnDate';
import { formatNumber, formatVnd } from '@/lib/format';

export type ReturnsTab = 'dueToday' | 'overdue' | 'ready' | 'delivered';

export const ReturnOrderCard = memo(function ReturnOrderCard({
  order,
  tab,
  onReturn,
}: {
  order: Order;
  tab: ReturnsTab;
  onReturn: (order: Order) => void;
}) {
  const debt = order.total_amount - (order.paid_amount || 0);
  const delivered = order.status === 'Delivered' || order.status === 'DeliveredOwing';

  return (
    <Card className="gap-0 p-4 transition-shadow hover:shadow-md md:p-5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
          <div
            className={
              delivered
                ? 'flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:size-12'
                : 'flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success md:size-12'
            }
          >
            {delivered ? <PackageCheck size={22} /> : <Scissors size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-foreground">#{order.id.toString().padStart(5, '0')}</h2>
              {order.status === 'Delivered' && <StatusBadge status="Delivered" label="Đã trả" />}
              {order.status === 'DeliveredOwing' && <StatusBadge status="DeliveredOwing" />}
              {canMarkOrderDeliveredAtCounter(order.status) && (
                // Đơn còn ở quầy: luôn màu "chờ trả", nhãn theo trạng thái thật (Ready → "Chờ trả").
                <StatusBadge
                  status={order.status}
                  label={order.status === 'Ready' ? 'Chờ trả' : undefined}
                  className="bg-success/10 text-success"
                />
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground">{order.customer?.name || 'Vãng lai'}</p>
              {order.customer?.phone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone size={11} />
                  {order.customer.phone}
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground md:text-xs">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-primary" />
                Nhận: {new Date(order.created_at).toLocaleDateString('vi-VN')}
              </span>
              {order.return_time &&
                (tab === 'overdue' ? (
                  <span className="flex items-center gap-1 font-bold text-destructive">
                    <AlertTriangle size={12} />
                    Hẹn trả: {formatVnDate(order.return_time)} · trễ {vnDaysUntilToday(order.return_time)} ngày
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <PackageCheck size={12} className="text-primary" />
                    {tab === 'delivered' ? 'Đã trả' : 'Hẹn trả'}: {formatVnDate(order.return_time)}
                  </span>
                ))}
            </div>

            {order.details && order.details.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {order.details.map((d) => (
                  <span
                    key={d.id}
                    className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {d.item_name}
                    {d.tailor?.name && <span className="ml-1 text-primary">· {d.tailor.name}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-center gap-3 border-t pt-3 sm:w-auto sm:flex-col sm:items-end sm:gap-2 sm:border-none sm:pt-0">
          <div className="flex-1 text-right sm:flex-none">
            <p className="text-base font-black text-foreground">{formatVnd(order.total_amount)}</p>
            {debt > 0 ? (
              <p className="text-[11px] font-bold text-warning">Còn nợ: {formatNumber(debt)}đ</p>
            ) : (
              <p className="text-[11px] font-bold text-success">Đã thanh toán đủ</p>
            )}
          </div>
          {tab !== 'delivered' && (
            <Button size="sm" onClick={() => onReturn(order)} className="shrink-0">
              <PackageCheck /> Trả đồ
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});
