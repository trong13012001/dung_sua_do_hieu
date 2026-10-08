'use client';

import React, { useCallback, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  ShoppingBag,
  User,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGetOrder } from '@/hooks/order/useGetOrder';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { useUpdateOrder, useUpdateOrderDetail } from '@/api/orders';
import { canMarkOrderDeliveredAtCounter, resolveStatusWhenMarkingDelivered } from '@/lib/orderStatusUi';
import type { Order, OrderDetail, Payment } from '@/lib/types';
import { cn, errorMessage } from '@/lib/utils';
import { formatNumber, formatVnd } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OrderDetailSkeleton } from '@/components/ui/loading-skeletons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { InlinePaymentForm } from '@/components/orders/order-detail/InlinePaymentForm';
import { OrderLinesSection, PaymentHistory } from '@/components/orders/order-detail/OrderLines';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | string | null;
  /** In tem barcode XP-235B cho một dòng (STT món 1-based, khớp mã quét). */
  onPrintItemBarcode?: (order: Order, lineIndex1Based: number) => void;
  /** Mở chồng lên modal khác (vd. lịch sử đơn ở POS). */
  stackOnTop?: boolean;
}

/** Nhãn + màu + icon trạng thái đơn ở đầu modal (nhãn riêng của màn này). */
const STATUS_INFO: Record<string, { label: string; className: string; icon: typeof Package }> = {
  New: { label: 'Mới', className: 'text-info', icon: AlertCircle },
  'In Progress': { label: 'Đang xử lý', className: 'text-warning', icon: Clock },
  Ready: { label: 'Sẵn sàng', className: 'text-success', icon: CheckCircle2 },
  Paid: { label: 'Đã thanh toán', className: 'text-emerald-800', icon: CheckCircle2 },
  Delivered: { label: 'Đã trả đồ', className: 'text-primary', icon: Package },
  DeliveredOwing: { label: 'Trả thiếu tiền', className: 'text-orange-800', icon: Package },
  Completed: { label: 'Hoàn thành', className: 'text-secondary', icon: CheckCircle2 },
};

function DateLine({ label, iso }: { label: string; iso: string }) {
  const d = new Date(iso);
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Calendar size={14} className="text-primary" />
        <span>{d.toLocaleDateString('vi-VN')}</span>
        <span className="ml-1 font-medium text-muted-foreground/70">
          {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 p-4 shadow-none md:p-5">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <User size={14} /> {title}
      </h3>
      {children}
    </Card>
  );
}

/** Nội dung modal cho một đơn. Mount lại theo mã đơn → state (đang lưu, lỗi, form thu tiền) tự reset. */
function OrderDetailBody({
  order,
  onPrintItemBarcode,
}: {
  order: Order;
  onPrintItemBarcode?: (order: Order, lineIndex1Based: number) => void;
}) {
  const currentUserId = useCurrentUserId();
  const { has } = useCurrentUserPermissions();
  const { mutateAsync: updateDetail } = useUpdateOrderDetail();
  const { mutateAsync: updateOrder, isPending: isUpdatingOrder } = useUpdateOrder();

  const canEditLineStatus = has('view_orders') || has('create_order') || has('update_tasks');
  const canProcessPayment = has('view_orders') || has('create_order') || has('process_payment');
  const canMarkDelivered =
    has('view_returns') || has('update_order_status') || has('view_orders') || has('create_order');

  const [savingLineId, setSavingLineId] = useState<number | null>(null);
  const [lineStatusErr, setLineStatusErr] = useState<string | null>(null);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [lastPayMethod, setLastPayMethod] = useState<Payment['payment_method']>('Cash');

  const handleLineStatusChange = useCallback(
    async (detail: OrderDetail, next: string) => {
      if (next === detail.status) return;
      setLineStatusErr(null);
      setSavingLineId(detail.id);
      try {
        await updateDetail({
          id: detail.id,
          detail: { status: next as OrderDetail['status'] },
          updated_by: currentUserId ?? undefined,
        });
      } catch (e) {
        setLineStatusErr(errorMessage(e));
      } finally {
        setSavingLineId(null);
      }
    },
    [currentUserId, updateDetail],
  );

  const printLabel = useCallback(
    (lineNo: number) => onPrintItemBarcode?.(order, lineNo),
    [onPrintItemBarcode, order],
  );

  const handleConfirmDeliver = async () => {
    try {
      const status = resolveStatusWhenMarkingDelivered(order);
      await updateOrder({
        id: order.id,
        order: { status, return_time: new Date().toISOString() },
        updated_by: currentUserId ?? undefined,
      });
      setDeliverOpen(false);
      toast.success(
        status === 'DeliveredOwing' ? 'Đã ghi nhận trả đồ — Trả thiếu tiền (còn nợ).' : 'Đã ghi nhận trả đồ.',
      );
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const statusInfo = STATUS_INFO[order.status] ?? { label: order.status, className: 'text-muted-foreground', icon: Package };
  const StatusIcon = statusInfo.icon;
  const debt = order.total_amount - (order.paid_amount ?? 0);
  const showDeliver = canMarkOrderDeliveredAtCounter(order.status) && canMarkDelivered;
  const showPay = debt > 0 && canProcessPayment;
  const tailorLines = order.details?.filter((d) => d.assigned_tailor_id) ?? [];

  return (
    <div className="space-y-6">
      {/* Trạng thái + ngày */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag size={22} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-muted-foreground">
              Trạng thái
            </p>
            <div className={cn('flex items-center gap-1.5 text-sm font-bold', statusInfo.className)}>
              <StatusIcon size={16} />
              {statusInfo.label}
            </div>
          </div>
        </div>
        <div className="w-full space-y-1 border-t pt-3 text-left sm:w-auto sm:border-none sm:pt-0 sm:text-right">
          <DateLine label="Ngày nhận" iso={order.receive_time} />
          {order.return_time && <DateLine label="Hẹn trả" iso={order.return_time} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="space-y-4">
          <InfoCard title="Khách hàng">
            <p className="text-base font-bold text-foreground md:text-lg">{order.customer?.name || 'Vãng lai'}</p>
            <div className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground">
              {order.customer?.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={12} className="text-primary/70" /> {order.customer.phone}
                </p>
              )}
              {order.customer?.address && (
                <p className="flex items-start gap-2">
                  <MapPin size={12} className="mt-0.5 shrink-0 text-primary/70" /> {order.customer.address}
                </p>
              )}
            </div>
          </InfoCard>
          <InfoCard title="Người tạo đơn">
            <p className="text-sm font-bold text-foreground md:text-base">{order.created_by_name?.trim() || '-'}</p>
          </InfoCard>
          <InfoCard title="Thợ xử lý">
            {tailorLines.length > 0 ? (
              <div className="space-y-1">
                {tailorLines.map((d) => (
                  <p key={d.id} className="text-sm text-foreground">
                    <span className="font-bold">{d.tailor?.name || 'N/A'}</span>{' '}
                    <span className="text-muted-foreground">· {d.item_name}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Chưa phân công thợ</p>
            )}
          </InfoCard>
        </div>

        {/* Thanh toán & trả đồ */}
        <Card className="gap-0 border-primary/20 bg-primary/5 p-5 shadow-none md:p-6">
          <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-primary">Thanh toán & trả đồ</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <span className="text-sm text-muted-foreground">Tổng cộng</span>
              <span className="text-lg font-bold text-foreground">{formatVnd(order.total_amount)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <span className="text-sm text-muted-foreground">Đã trả</span>
              <span className="text-lg font-bold text-success">{formatVnd(order.paid_amount ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold uppercase tracking-wider text-primary">Còn lại</span>
              <span className="text-2xl font-black text-primary">{formatVnd(debt)}</span>
            </div>
          </div>

          {(showDeliver || showPay) && (
            <div className="mt-5 space-y-3 border-t border-primary/15 pt-4">
              {showDeliver && (
                <Button onClick={() => setDeliverOpen(true)} disabled={isUpdatingOrder} className="w-full">
                  <PackageCheck /> Trả đồ cho khách
                </Button>
              )}
              {showPay && (
                <InlinePaymentForm
                  key={`${order.id}-${order.paid_amount ?? 0}-${order.total_amount}`}
                  order={order}
                  currentUserId={currentUserId}
                  initialMethod={lastPayMethod}
                  onPaid={setLastPayMethod}
                />
              )}
            </div>
          )}
        </Card>
      </div>

      <OrderLinesSection
        order={order}
        canEditStatus={canEditLineStatus}
        savingLineId={savingLineId}
        error={lineStatusErr}
        onStatusChange={handleLineStatusChange}
        onPrintLabel={onPrintItemBarcode ? printLabel : undefined}
      />

      <PaymentHistory payments={order.payments} />

      <ConfirmDialog
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        title={`Xác nhận trả đồ · #${String(order.id).padStart(5, '0')}`}
        description={
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between text-sm font-bold text-foreground">
                <span>Đơn #{String(order.id).padStart(5, '0')}</span>
                <span>{formatVnd(order.total_amount)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <UserCheck size={14} />
                <span className="font-medium">{order.customer?.name || 'Vãng lai'}</span>
                {order.customer?.phone && <span className="text-muted-foreground">— {order.customer.phone}</span>}
              </div>
            </div>
            {debt > 0 && (
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs font-bold leading-relaxed text-warning">
                Còn nợ {formatNumber(debt)}đ. Sau khi xác nhận, trạng thái đơn:{' '}
                <span className="text-foreground">
                  {resolveStatusWhenMarkingDelivered(order) === 'DeliveredOwing' ? 'Trả thiếu tiền' : 'Đã trả đồ'}
                </span>
                .
              </div>
            )}
            <p>Xác nhận đã giao đồ cho khách? Hệ thống ghi nhận thời điểm trả đồ và cập nhật trạng thái đơn tương ứng.</p>
          </div>
        }
        confirmLabel="Xác nhận trả đồ"
        isPending={isUpdatingOrder}
        onConfirm={handleConfirmDeliver}
      />
    </div>
  );
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onPrintItemBarcode,
  stackOnTop = false,
}) => {
  const { data: order, isLoading, error } = useGetOrder(orderId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className={cn('max-h-[90vh] gap-4 overflow-y-auto p-5 sm:max-w-3xl md:p-6', stackOnTop && 'z-[60]')}
      >
        <DialogHeader>
          <DialogTitle>Chi tiết đơn hàng: #{orderId}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <OrderDetailSkeleton />
        ) : error ? (
          <p className="py-10 text-center text-destructive">Có lỗi xảy ra khi tải thông tin đơn hàng.</p>
        ) : order ? (
          <OrderDetailBody key={order.id} order={order} onPrintItemBarcode={onPrintItemBarcode} />
        ) : (
          <p className="py-10 text-center text-muted-foreground">Không tìm thấy dữ liệu đơn hàng.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
