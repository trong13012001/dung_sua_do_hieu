'use client';

import { memo } from 'react';
import { CreditCard, DollarSign, Package, Tag, Wallet } from 'lucide-react';
import type { Order, OrderDetail, Payment } from '@/lib/types';
import { orderDetailStatusSelectOptions } from '@/lib/orderDetailStatusUi';
import { formatNumber } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconAction } from '@/components/common/IconAction';

type LineProps = {
  detail: OrderDetail;
  /** STT món (1-based) — khớp mã quét trên tem. */
  lineNo: number;
  canEditStatus: boolean;
  /** Đang lưu một dòng nào đó → khoá mọi ô trạng thái. */
  disabled: boolean;
  onStatusChange: (detail: OrderDetail, next: string) => void;
  onPrintLabel?: (lineNo: number) => void;
};

function LineStatus({ detail, canEditStatus, disabled, onStatusChange }: LineProps) {
  if (!canEditStatus) {
    return <StatusBadge kind="detail" status={detail.status} className="text-[10px] uppercase tracking-wider" />;
  }
  return (
    <Select value={detail.status} disabled={disabled} onValueChange={(v) => onStatusChange(detail, v)}>
      <SelectTrigger size="sm" aria-label={`Trạng thái ${detail.item_name}`} className="w-full max-w-[280px] text-xs font-semibold">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {orderDetailStatusSelectOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Một món — dòng bảng trên desktop, thẻ trên mobile. */
const OrderLine = memo(function OrderLine(props: LineProps) {
  const { detail, lineNo, onPrintLabel } = props;
  const printButton = onPrintLabel ? (
    <IconAction icon={Tag} label="In tem barcode món này" tone="info" onClick={() => onPrintLabel(lineNo)} />
  ) : null;
  return (
    <>
      {/* Desktop */}
      <div className="hidden grid-cols-[2.5rem_1.2fr_1fr_minmax(180px,1.2fr)_6rem_auto] items-center gap-3 px-5 py-3 text-sm md:grid">
        <span className="font-bold text-foreground">{lineNo}</span>
        <span className="font-bold text-foreground">{detail.item_name}</span>
        <span className="truncate text-muted-foreground">{detail.description || '-'}</span>
        <LineStatus {...props} />
        <span className="text-right font-bold text-foreground">{formatNumber(detail.unit_price)}</span>
        <span className="w-8">{printButton}</span>
      </div>
      {/* Mobile */}
      <div className="space-y-3 p-4 md:hidden">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-foreground">
            {lineNo}. {detail.item_name}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <p className="text-sm font-black text-primary">{formatNumber(detail.unit_price)}đ</p>
            {printButton}
          </div>
        </div>
        {detail.description && <p className="text-xs leading-relaxed text-muted-foreground">{detail.description}</p>}
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trạng thái món</p>
          <LineStatus {...props} />
        </div>
      </div>
    </>
  );
});

export function OrderLinesSection({
  order,
  canEditStatus,
  savingLineId,
  error,
  onStatusChange,
  onPrintLabel,
}: {
  order: Order;
  canEditStatus: boolean;
  savingLineId: number | null;
  error: string | null;
  onStatusChange: (detail: OrderDetail, next: string) => void;
  onPrintLabel?: (lineNo: number) => void;
}) {
  const details = order.details ?? [];
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="border-b border-border bg-muted/30 px-4 py-3 md:px-5">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Package size={14} /> Sản phẩm & Dịch vụ
        </h3>
      </div>
      {error && canEditStatus && (
        <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive md:px-5">
          {error}
        </div>
      )}
      <div className="hidden grid-cols-[2.5rem_1.2fr_1fr_minmax(180px,1.2fr)_6rem_auto] gap-3 border-b border-border px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
        <span>STT</span>
        <span>Tên mục</span>
        <span>Mô tả</span>
        <span>Trạng thái món</span>
        <span className="text-right">Đơn giá</span>
        <span className="w-8">{onPrintLabel ? 'Tem' : ''}</span>
      </div>
      <div className="divide-y divide-border">
        {details.length > 0 ? (
          details.map((detail, idx) => (
            <OrderLine
              key={detail.id}
              detail={detail}
              lineNo={idx + 1}
              canEditStatus={canEditStatus}
              disabled={savingLineId !== null}
              onStatusChange={onStatusChange}
              onPrintLabel={onPrintLabel}
            />
          ))
        ) : (
          <p className="px-6 py-8 text-center text-sm italic text-muted-foreground">Không có chi tiết sản phẩm</p>
        )}
      </div>
    </Card>
  );
}

const METHOD_INFO: Record<string, { label: string; icon: typeof DollarSign }> = {
  Cash: { label: 'Tiền mặt', icon: DollarSign },
  Card: { label: 'Thẻ', icon: CreditCard },
  Transfer: { label: 'Chuyển khoản', icon: Wallet },
};

export const PaymentHistory = memo(function PaymentHistory({ payments }: { payments: Payment[] | undefined }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="border-b border-border bg-muted/30 px-4 py-3 md:px-5">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <DollarSign size={14} /> Lịch sử thanh toán
        </h3>
      </div>
      <div className="space-y-3 px-4 py-4 md:px-5">
        {payments && payments.length > 0 ? (
          payments.map((payment) => {
            const info = METHOD_INFO[payment.payment_method] ?? { label: payment.payment_method, icon: DollarSign };
            const Icon = info.icon;
            const time = new Date(payment.payment_time);
            return (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{info.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {time.toLocaleDateString('vi-VN')} -{' '}
                      {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-black text-success">+{formatNumber(payment.amount)}đ</p>
              </div>
            );
          })
        ) : (
          <p className="py-4 text-center text-sm italic text-muted-foreground">Chưa có giao dịch thanh toán nào</p>
        )}
      </div>
    </Card>
  );
});
