'use client';

import { memo } from 'react';
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit2,
  ListOrdered,
  PackageCheck,
  Printer,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { IconAction } from '@/components/common/IconAction';
import type { Order } from '@/lib/types';
import { canMarkOrderDeliveredAtCounter } from '@/lib/orderStatusUi';
import { formatNumber, formatVnd } from '@/lib/format';
import { ORDER_STATUS_OPTION_LABEL } from '@/components/orders/orderStatusOptions';
import { getDeliveryStatusLabel, getLatestPaymentMethod } from './orderListLabels';

export type OrderRowActions = {
  onOpen: (orderId: number) => void;
  onToggleSelect: (orderId: number) => void;
  onPay: (order: Order) => void;
  onDeliver: (order: Order) => void;
  onComplete: (order: Order) => void;
  onPrintInvoice: (order: Order) => void;
  onPrintLabels: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
};

/** Một đơn trong danh sách /orders. Bấm thẻ mở chi tiết; nút và ô chọn không lan sự kiện lên thẻ. */
export const OrderRow = memo(function OrderRow({
  order,
  selected,
  busy,
  actions,
}: {
  order: Order;
  selected: boolean;
  /** Đang ghi trạng thái đơn → khoá các nút đổi trạng thái. */
  busy: boolean;
  actions: OrderRowActions;
}) {
  const debt = order.total_amount - (order.paid_amount || 0);
  const isPaid = debt <= 0;
  const deliveryStatusLabel = getDeliveryStatusLabel(order);
  const paymentMethodLabel = isPaid && deliveryStatusLabel ? getLatestPaymentMethod(order) : '';
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => actions.onOpen(order.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) actions.onOpen(order.id);
      }}
      className="cursor-pointer gap-0 p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 md:p-5"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
          <label
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center md:size-11"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={() => actions.onToggleSelect(order.id)}
              className="size-5"
              aria-label={`Chọn đơn #${order.id} để in phiếu`}
            />
          </label>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:size-11">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-foreground">#{order.id.toString().padStart(5, '0')}</h2>
              <StatusBadge
                status={order.status}
                label={ORDER_STATUS_OPTION_LABEL[order.status]}
                className="text-[10px] uppercase tracking-wider"
              />
            </div>
            <p className="text-sm font-medium text-foreground">{order.customer?.name || 'Vãng lai'}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground md:text-xs">
              <Calendar size={12} className="text-primary" />
              {new Date(order.created_at).toLocaleDateString('vi-VN')}
            </p>
            {order.details && order.details.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {order.details.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex flex-wrap items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <span>{d.item_name}</span>
                    <StatusBadge kind="detail" status={d.status} className="rounded px-1 py-0 text-[9px]" />
                    {d.tailor?.name && <span className="text-primary">· {d.tailor.name}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-center gap-3 border-t pt-3 sm:w-auto sm:flex-col sm:items-end sm:gap-1 sm:border-none sm:pt-0">
          <div className="flex-1 text-right sm:flex-none">
            <p className="text-base font-black text-foreground">{formatVnd(order.total_amount)}</p>
            {debt > 0 && <p className="text-[11px] font-bold text-warning">Nợ: {formatNumber(debt)}đ</p>}
            {isPaid && <p className="text-[11px] font-bold text-success">Đã thanh toán</p>}
            {deliveryStatusLabel && <p className="text-[11px] font-bold text-primary">{deliveryStatusLabel}</p>}
            {paymentMethodLabel && <p className="text-[11px] font-bold text-info">PTTT: {paymentMethodLabel}</p>}
          </div>
          <div className="flex max-w-full shrink-0 flex-wrap justify-end gap-0.5">
            <IconAction icon={ListOrdered} label="Chi tiết đơn và danh sách mặt hàng" onClick={stop(() => actions.onOpen(order.id))} />
            {debt > 0 && (
              <IconAction icon={DollarSign} label="Ghi nhận thanh toán (chỉ tiền)" tone="success" disabled={busy} onClick={stop(() => actions.onPay(order))} />
            )}
            {canMarkOrderDeliveredAtCounter(order.status) && (
              <IconAction icon={PackageCheck} label="Trả đồ cho khách (xác nhận)" disabled={busy} onClick={stop(() => actions.onDeliver(order))} />
            )}
            {order.status !== 'Completed' && (
              <IconAction
                icon={CheckCircle2}
                label={debt > 0 ? 'Thu đủ tiền trước khi hoàn thành đơn' : 'Hoàn thành đơn (xác nhận)'}
                disabled={debt > 0 || busy}
                onClick={stop(() => actions.onComplete(order))}
              />
            )}
            <IconAction icon={Printer} label="In phiếu" onClick={stop(() => actions.onPrintInvoice(order))} />
            {order.details && order.details.length > 0 && (
              <IconAction icon={Tag} label="In tem barcode từng món" tone="info" onClick={stop(() => actions.onPrintLabels(order))} />
            )}
            <IconAction icon={Edit2} label="Sửa" onClick={stop(() => actions.onEdit(order))} />
            <IconAction icon={Trash2} label="Xóa" tone="danger" onClick={stop(() => actions.onDelete(order))} />
          </div>
        </div>
      </div>
    </Card>
  );
});
