'use client';

import { memo } from 'react';
import { Calendar, ChevronRight, Clock, Edit2, Loader2, Printer, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { IconAction } from '@/components/common/IconAction';
import type { Order } from '@/lib/types';
import { formatNumber, formatVnd } from '@/lib/format';

export type CustomerOrderCardActions = {
  onOpen: (orderId: number) => void;
  onPrintInvoice: (order: Order) => void;
  onPrintLabels: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
};

/** Một đơn trong lịch sử của khách. Bấm thẻ mở chi tiết; các nút không lan sự kiện lên thẻ. */
export const CustomerOrderCard = memo(function CustomerOrderCard({
  order,
  printing,
  onOpen,
  onPrintInvoice,
  onPrintLabels,
  onEdit,
  onDelete,
}: CustomerOrderCardActions & { order: Order; printing: boolean }) {
  const debt = order.total_amount - (order.paid_amount || 0);
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(order.id)}
      onKeyDown={(e) => {
        // Chỉ khi focus đang ở chính thẻ — Enter trên nút bên trong không mở chi tiết.
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(order.id);
      }}
      className="group cursor-pointer gap-0 p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 md:p-5"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex w-full items-center gap-3 sm:w-auto md:gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-xs transition-colors group-hover:bg-primary group-hover:text-primary-foreground md:size-12">
            <ShoppingBag size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="font-bold text-foreground md:text-lg">#{order.id}</h2>
              <StatusBadge status={order.status} className="text-[10px] uppercase tracking-wider" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground md:mt-2 md:text-xs">
              <span className="flex items-center gap-1 font-medium">
                <Calendar size={12} className="text-primary" />
                {new Date(order.receive_time).toLocaleDateString('vi-VN')}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Clock size={12} className="text-primary" />
                {new Date(order.receive_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-1 w-full border-t pt-2 text-left sm:mt-0 sm:w-auto sm:border-none sm:pt-0 sm:text-right">
          <p className="text-base font-black text-foreground md:text-lg">{formatVnd(order.total_amount)}</p>
          <p className="mt-0.5 text-[11px] font-black uppercase tracking-wider">
            {order.paid_amount >= order.total_amount ? (
              <span className="text-success">Đã thanh toán</span>
            ) : (
              <span className="text-warning">Còn nợ: {formatNumber(debt)}đ</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex min-w-0 flex-wrap gap-2">
          {order.details?.slice(0, 3).map((detail, idx) => (
            <span
              key={detail.id ?? idx}
              className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {detail.item_name}
            </span>
          ))}
          {order.details && order.details.length > 3 && (
            <span className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              +{order.details.length - 3} nữa
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction
            icon={printing ? Loader2 : Printer}
            label="In hóa đơn"
            disabled={printing}
            onClick={stop(() => onPrintInvoice(order))}
            className={printing ? '[&_svg]:animate-spin' : undefined}
          />
          {order.details && order.details.length > 0 && (
            <IconAction icon={Tag} label="In tem barcode từng món" tone="info" onClick={stop(() => onPrintLabels(order))} />
          )}
          <IconAction icon={Edit2} label="Sửa đơn" onClick={stop(() => onEdit(order))} />
          <IconAction icon={Trash2} label="Xóa đơn" tone="danger" onClick={stop(() => onDelete(order))} />
          <span className="ml-1 hidden items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary opacity-0 transition-opacity group-hover:opacity-100 md:flex">
            Chi tiết <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Card>
  );
});
