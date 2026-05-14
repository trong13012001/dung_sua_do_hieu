'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useGetOrder } from '@/hooks/order/useGetOrder';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { useUpdateOrder, useUpdateOrderDetail } from '@/api/orders';
import { useProcessPayment } from '@/api/payments';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { validateNumber } from '@/lib/validation';
import {
  canMarkOrderDeliveredAtCounter,
  resolveStatusWhenMarkingDelivered,
} from '@/lib/orderStatusUi';
import {
  ShoppingBag,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Package,
  DollarSign,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChevronDown,
  PackageCheck,
  UserCheck,
} from 'lucide-react';
import { Order, OrderDetail, Payment } from '@/lib/types';
import {
  orderDetailStatusBadgeClass,
  orderDetailStatusLabelVi,
  orderDetailStatusSelectOptions,
} from '@/lib/orderDetailStatusUi';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | string | null;
  /** In tem barcode XP-235B cho một dòng (STT món 1-based, khớp mã quét). */
  onPrintItemBarcode?: (order: Order, lineIndex1Based: number) => void;
  /** z-index cao hơn khi mở chồng lên modal khác (vd. lịch sử đơn ở POS). */
  stackOnTop?: boolean;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onPrintItemBarcode,
  stackOnTop = false,
}) => {
  const { data: order, isLoading, error } = useGetOrder(orderId);
  const { mutateAsync: mutateUpdateDetail } = useUpdateOrderDetail();
  const { mutateAsync: mutateUpdateOrder, isPending: isPendingUpdateOrder } =
    useUpdateOrder();
  const { mutateAsync: mutateProcessPayment, isPending: isPendingPayment } =
    useProcessPayment();
  const currentUserId = useCurrentUserId();
  const { has } = useCurrentUserPermissions();
  const { toast, showToast, hideToast } = useToast();
  const canEditLineStatus =
    has('view_orders') || has('create_order') || has('update_tasks');
  const canProcessPayment =
    has('view_orders') || has('create_order') || has('process_payment');
  const canMarkDelivered =
    has('view_returns') ||
    has('update_order_status') ||
    has('view_orders') ||
    has('create_order');
  const [savingLineId, setSavingLineId] = useState<number | null>(null);
  const [lineStatusErr, setLineStatusErr] = useState<string | null>(null);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [payForm, setPayForm] = useState<{
    amount: string;
    method: Payment['payment_method'];
    splitPay: boolean;
    amount2: string;
    method2: Payment['payment_method'];
  }>({
    amount: '',
    method: 'Cash',
    splitPay: false,
    amount2: '',
    method2: 'Transfer',
  });
  const [payFlowBusy, setPayFlowBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLineStatusErr(null);
      setSavingLineId(null);
      setDeliverOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !order) return;
    const d = order.total_amount - (order.paid_amount ?? 0);
    setPayForm((prev) => ({
      amount: d > 0 ? String(d) : '',
      method: prev.method,
      splitPay: false,
      amount2: '',
      method2: prev.method2,
    }));
  }, [isOpen, orderId, order?.total_amount, order?.paid_amount]);

  const paymentPreview = useMemo(() => {
    if (!order) return null;
    const total = order.total_amount;
    const paid = order.paid_amount ?? 0;
    const parsePositive = (s: string) => {
      const t = s.trim();
      if (t === '') return 0;
      const n = Number(t);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const a1 = parsePositive(payForm.amount);
    const a2 = payForm.splitPay ? parsePositive(payForm.amount2) : 0;
    const thisPayment = payForm.splitPay ? a1 + a2 : a1;
    const currentDebt = Math.max(0, total - paid);
    const paidAfter = paid + thisPayment;
    const remainingAfter = Math.max(0, total - paidAfter);
    return {
      total,
      paid,
      thisPayment,
      currentDebt,
      paidAfter,
      remainingAfter,
    };
  }, [order, payForm.amount, payForm.amount2, payForm.splitPay]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || payFlowBusy) return;
    const debt = Math.max(
      0,
      order.total_amount - (order.paid_amount ?? 0),
    );

    const runOne = async (amt: number, method: Payment['payment_method']) => {
      await mutateProcessPayment({
        order_id: order.id,
        amount: amt,
        payment_method: method,
        updated_by: currentUserId ?? undefined,
      });
    };

    try {
      setPayFlowBusy(true);
      if (payForm.splitPay) {
        const err1 = validateNumber(payForm.amount, {
          min: 1,
          fieldName: 'Số tiền khoản 1',
        });
        const err2 = validateNumber(payForm.amount2, {
          min: 1,
          fieldName: 'Số tiền khoản 2',
        });
        if (err1) {
          showToast(err1, 'error');
          return;
        }
        if (err2) {
          showToast(err2, 'error');
          return;
        }
        const amt1 = Number(payForm.amount);
        const amt2 = Number(payForm.amount2);
        const sum = amt1 + amt2;
        if (sum > debt + 0.01) {
          showToast(
            `Tổng hai khoản không được vượt còn lại (${new Intl.NumberFormat('vi-VN').format(debt)}đ).`,
            'error',
          );
          return;
        }
        await runOne(amt1, payForm.method);
        await runOne(amt2, payForm.method2);
        const nextDebt = Math.max(0, debt - sum);
        setPayForm({
          amount: nextDebt > 0 ? String(nextDebt) : '',
          method: 'Cash',
          splitPay: false,
          amount2: '',
          method2: 'Transfer',
        });
        showToast('Đã ghi nhận thanh toán.', 'success');
      } else {
        const amountErr = validateNumber(payForm.amount, {
          min: 1,
          fieldName: 'Số tiền thanh toán',
        });
        if (amountErr) {
          showToast(amountErr, 'error');
          return;
        }
        const amt = Number(payForm.amount);
        await runOne(amt, payForm.method);
        const nextDebt = Math.max(0, debt - amt);
        setPayForm({
          amount: nextDebt > 0 ? String(nextDebt) : '',
          method: payForm.method,
          splitPay: false,
          amount2: '',
          method2: 'Transfer',
        });
        showToast('Đã ghi nhận thanh toán.', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Lỗi: ' + msg, 'error');
    } finally {
      setPayFlowBusy(false);
    }
  };

  const handleConfirmDeliver = async () => {
    if (!order) return;
    try {
      const status = resolveStatusWhenMarkingDelivered(order);
      await mutateUpdateOrder({
        id: order.id,
        order: {
          status,
          return_time: new Date().toISOString(),
        },
        updated_by: currentUserId ?? undefined,
      });
      setDeliverOpen(false);
      showToast(
        status === 'DeliveredOwing'
          ? 'Đã ghi nhận trả đồ — Trả thiếu tiền (còn nợ).'
          : 'Đã ghi nhận trả đồ.',
        'success',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Lỗi: ' + msg, 'error');
    }
  };

  const handleLineStatusChange = useCallback(
    async (detail: OrderDetail, next: string) => {
      if (next === detail.status) return;
      setLineStatusErr(null);
      setSavingLineId(detail.id);
      try {
        await mutateUpdateDetail({
          id: detail.id,
          detail: { status: next as OrderDetail['status'] },
          updated_by: currentUserId ?? undefined,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setLineStatusErr(msg);
      } finally {
        setSavingLineId(null);
      }
    },
    [currentUserId, mutateUpdateDetail],
  );

  const lineStatusSelectClass =
    'w-full appearance-none bg-muted/20 border border-border rounded-md pl-2 pr-8 py-2 text-[10px] md:text-[11px] font-bold text-foreground outline-none focus:ring-1 focus:ring-primary disabled:opacity-50';

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'New':
        return { label: 'Mới', color: 'bg-info/10 text-info', icon: <AlertCircle size={16} /> };
      case 'In Progress':
        return { label: 'Đang xử lý', color: 'bg-warning/10 text-warning', icon: <Clock size={16} /> };
      case 'Ready':
        return { label: 'Sẵn sàng', color: 'bg-success/10 text-success', icon: <CheckCircle2 size={16} /> };
      case 'Paid':
        return { label: 'Đã thanh toán', color: 'bg-emerald-600/12 text-emerald-800 dark:text-emerald-400', icon: <CheckCircle2 size={16} /> };
      case 'Delivered':
        return { label: 'Đã trả đồ', color: 'bg-primary/10 text-primary', icon: <Package size={16} /> };
      case 'DeliveredOwing':
        return { label: 'Trả thiếu tiền', color: 'bg-orange-500/15 text-orange-800 dark:text-orange-400', icon: <Package size={16} /> };
      case 'Completed':
        return { label: 'Hoàn thành', color: 'bg-secondary/10 text-secondary', icon: <CheckCircle2 size={16} /> };
      default:
        return { label: status, color: 'bg-muted/10 text-muted-foreground', icon: <Package size={16} /> };
    }
  };

  const getDetailLineStatusInfo = (status: string) => ({
    label: orderDetailStatusLabelVi(status),
    color: orderDetailStatusBadgeClass(status),
    icon: <Package size={16} />,
  });

  const getPaymentMethodInfo = (method: string) => {
    switch (method) {
      case 'Cash':
        return { label: 'Tiền mặt', icon: <DollarSign size={14} /> };
      case 'Card':
        return { label: 'Thẻ', icon: <CreditCard size={14} /> };
      case 'Transfer':
        return { label: 'Chuyển khoản', icon: <Wallet size={14} /> };
      default:
        return { label: method, icon: <DollarSign size={14} /> };
    }
  };

  const statusInfo = order ? getStatusInfo(order.status) : null;
  const detailDebt =
    order != null ? order.total_amount - (order.paid_amount ?? 0) : 0;
  const showDeliverInDetail =
    order != null &&
    canMarkOrderDeliveredAtCounter(order.status) &&
    canMarkDelivered;
  const showPayInDetail =
    order != null && detailDebt > 0 && canProcessPayment;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết đơn hàng: #${orderId}`}
      maxWidth="max-w-3xl"
      stackOnTop={stackOnTop}
    >
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-danger">
          <p>Có lỗi xảy ra khi tải thông tin đơn hàng.</p>
        </div>
      ) : order ? (
        <div className="space-y-6 md:space-y-6 pr-1 custom-scrollbar pb-6 md:pb-0">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 md:p-4 bg-muted/5 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                <ShoppingBag size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Trạng thái</p>
                <div className={`flex items-center gap-1.5 font-bold text-xs md:text-sm ${statusInfo?.color.split(' ')[1]}`}>
                  {statusInfo?.icon}
                  {statusInfo?.label}
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0 space-y-1">
              <div>
                <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                  Ngày nhận
                </p>
                <div className="flex items-center gap-1.5 font-bold text-foreground text-xs md:text-sm">
                  <Calendar size={14} className="text-primary md:w-4 md:h-4" />
                  <span>{new Date(order.receive_time).toLocaleDateString('vi-VN')}</span>
                  <span className="text-muted-foreground opacity-50 ml-1 font-medium">
                    {new Date(order.receive_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              {order.return_time && (
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                    Hẹn trả
                  </p>
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-xs md:text-sm">
                    <Calendar size={14} className="text-primary md:w-4 md:h-4" />
                    <span>{new Date(order.return_time).toLocaleDateString('vi-VN')}</span>
                    <span className="text-muted-foreground opacity-50 ml-1 font-medium">
                      {new Date(order.return_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Customer & Tailor Info */}
            <div className="space-y-4 md:space-y-6">
              <div className="vuexy-card p-4 md:p-5 !shadow-none border border-border bg-transparent">
                <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 md:mb-4 flex items-center gap-2">
                  <User size={12} className="md:w-[14px] md:h-[14px]" /> Khách hàng
                </h6>
                <div className="space-y-2 md:space-y-3">
                  <p className="font-bold text-base md:text-lg text-foreground">{order.customer?.name || 'Vãng lai'}</p>
                  <div className="grid grid-cols-1 gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                    {order.customer?.phone && <p className="flex items-center gap-2"><Phone size={12} className="text-primary opacity-70" /> {order.customer.phone}</p>}
                    {order.customer?.address && <p className="flex items-start gap-2"><MapPin size={12} className="mt-0.5 text-primary opacity-70 shrink-0" /> {order.customer.address}</p>}
                  </div>
                </div>
              </div>

              <div className="vuexy-card p-4 md:p-5 !shadow-none border border-border bg-transparent">
                <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 md:mb-4 flex items-center gap-2">
                  <User size={12} className="md:w-[14px] md:h-[14px]" /> Người tạo đơn
                </h6>
                <p className="font-bold text-sm md:text-base text-foreground">
                  {order.created_by_name?.trim() || '-'}
                </p>
              </div>

              <div className="vuexy-card p-4 md:p-5 !shadow-none border border-border bg-transparent">
                <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 md:mb-4 flex items-center gap-2">
                  <User size={12} className="md:w-[14px] md:h-[14px]" /> Thợ xử lý
                </h6>
                {order.details?.some(d => d.assigned_tailor_id) ? (
                  <div className="space-y-1">
                    {order.details?.filter(d => d.assigned_tailor_id).map(d => (
                      <p key={d.id} className="text-sm text-foreground"><span className="font-bold">{d.tailor?.name || 'N/A'}</span> <span className="text-muted-foreground">· {d.item_name}</span></p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs md:text-sm text-muted-foreground italic">Chưa phân công thợ</p>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="vuexy-card p-5 md:p-6 !shadow-none border border-border bg-primary/5">
              <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary mb-4 md:mb-6">Thanh toán & trả đồ</h6>
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center pb-2 md:pb-3 border-b border-primary/10">
                  <span className="text-xs md:text-sm text-muted-foreground">Tổng cộng</span>
                  <span className="text-base md:text-lg font-bold text-foreground">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 md:pb-3 border-b border-primary/10">
                  <span className="text-xs md:text-sm text-muted-foreground">Đã trả</span>
                  <span className="text-base md:text-lg font-bold text-success">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.paid_amount ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 md:pt-2">
                  <span className="text-xs md:text-sm font-bold text-primary uppercase tracking-wider">Còn lại</span>
                  <span className="text-xl md:text-2xl font-black text-primary">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailDebt)}
                  </span>
                </div>
              </div>

              {(showDeliverInDetail || showPayInDetail) && (
                <div className="mt-4 md:mt-5 pt-4 border-t border-primary/15 space-y-3">
                  {showDeliverInDetail && (
                    <button
                      type="button"
                      onClick={() => setDeliverOpen(true)}
                      disabled={isPendingUpdateOrder}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md font-bold text-xs md:text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <PackageCheck size={16} />
                      Trả đồ cho khách
                    </button>
                  )}
                  {showPayInDetail && paymentPreview && (
                    <form onSubmit={(e) => void handlePayment(e)} className="space-y-3">
                      <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed">
                        Ghi nhận tiền đã thu. Khi đủ tiền, hệ thống tự cập nhật trạng thái thanh toán; nếu đơn đang Trả thiếu tiền, có thể chuyển sang Đã trả đồ sau khi thu đủ.
                      </p>
                      <div className="p-3 bg-muted/10 rounded-lg border border-border space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Còn nợ hiện tại</span>
                          <span className="font-bold text-primary">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(paymentPreview.currentDebt)}
                          </span>
                        </div>
                        {paymentPreview.thisPayment > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sau lần này (dự kiến)</span>
                            <span className="font-bold">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(paymentPreview.remainingAfter)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/5 p-2.5">
                        <input
                          id="order-detail-split-pay"
                          type="checkbox"
                          checked={payForm.splitPay}
                          onChange={(e) =>
                            setPayForm((p) => ({
                              ...p,
                              splitPay: e.target.checked,
                            }))
                          }
                          className="mt-0.5 shrink-0"
                        />
                        <label
                          htmlFor="order-detail-split-pay"
                          className="cursor-pointer text-[10px] leading-snug text-muted-foreground"
                        >
                          <span className="font-bold text-foreground">
                            Chia nhiều phương thức
                          </span>
                          {' — '}
                          ghi hai khoản trong một lần (vd. một phần tiền mặt, một
                          phần chuyển khoản).
                        </label>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          {payForm.splitPay ? 'Khoản 1 — số tiền' : 'Số tiền thu'}
                        </label>
                        <input
                          required
                          type="number"
                          min={1}
                          className="w-full bg-muted/20 border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                          value={payForm.amount}
                          onChange={(e) =>
                            setPayForm((p) => ({ ...p, amount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          {payForm.splitPay
                            ? 'Khoản 1 — phương thức'
                            : 'Phương thức'}
                        </label>
                        <select
                          className="w-full bg-muted/20 border border-border rounded-md px-3 py-2 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary"
                          value={payForm.method}
                          onChange={(e) =>
                            setPayForm((p) => ({
                              ...p,
                              method: e.target.value as Payment['payment_method'],
                            }))
                          }
                        >
                          <option value="Cash">Tiền mặt</option>
                          <option value="Card">Thẻ</option>
                          <option value="Transfer">Chuyển khoản</option>
                        </select>
                      </div>
                      {payForm.splitPay ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Khoản 2 — số tiền
                            </label>
                            <input
                              required
                              type="number"
                              min={1}
                              className="w-full bg-muted/20 border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                              value={payForm.amount2}
                              onChange={(e) =>
                                setPayForm((p) => ({
                                  ...p,
                                  amount2: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Khoản 2 — phương thức
                            </label>
                            <select
                              className="w-full bg-muted/20 border border-border rounded-md px-3 py-2 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary"
                              value={payForm.method2}
                              onChange={(e) =>
                                setPayForm((p) => ({
                                  ...p,
                                  method2: e.target.value as Payment['payment_method'],
                                }))
                              }
                            >
                              <option value="Cash">Tiền mặt</option>
                              <option value="Card">Thẻ</option>
                              <option value="Transfer">Chuyển khoản</option>
                            </select>
                          </div>
                        </>
                      ) : null}
                      <button
                        type="submit"
                        disabled={isPendingPayment || payFlowBusy}
                        className="w-full btn-primary py-2.5 rounded-md font-bold text-xs md:text-sm disabled:opacity-50"
                      >
                        {isPendingPayment || payFlowBusy
                          ? 'Đang xử lý...'
                          : 'Ghi nhận thanh toán'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Details List (Responsive: Table on md+, Cards on <md) */}
          <div className="vuexy-card !shadow-none border border-border bg-transparent overflow-hidden">
            <div className="bg-muted/5 px-4 md:px-6 py-3 md:py-4 border-b border-border">
              <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Package size={12} className="md:w-[14px] md:h-[14px]" /> Sản phẩm & Dịch vụ
              </h6>
            </div>
            {lineStatusErr && canEditLineStatus ? (
              <div className="px-4 md:px-6 py-2 text-[11px] md:text-xs text-danger bg-danger/5 border-b border-danger/20">
                {lineStatusErr}
              </div>
            ) : null}

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/5">
                    <th className="px-6 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">STT</th>
                    <th className="px-6 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Tên mục</th>
                    <th className="px-6 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Mô tả</th>
                    <th className="px-6 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px] min-w-[200px]">
                      Trạng thái món
                    </th>
                    <th className="px-6 py-3 text-right font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Đơn giá</th>
                    {onPrintItemBarcode ? (
                      <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px] w-[1%] whitespace-nowrap">
                        Tem
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.details && order.details.length > 0 ? (
                    order.details.map((detail: OrderDetail, rowIdx: number) => (
                      <tr key={detail.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">{rowIdx + 1}</td>
                        <td className="px-6 py-4 font-bold text-foreground">{detail.item_name}</td>
                        <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{detail.description || '-'}</td>
                        <td className="px-6 py-4">
                          {canEditLineStatus ? (
                            <div className="relative max-w-[min(280px,100%)]">
                              <select
                                value={detail.status}
                                disabled={savingLineId !== null}
                                onChange={(e) => {
                                  void handleLineStatusChange(
                                    detail,
                                    e.target.value,
                                  );
                                }}
                                className={lineStatusSelectClass}
                                aria-label={`Trạng thái ${detail.item_name}`}
                              >
                                {orderDetailStatusSelectOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={14}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                aria-hidden
                              />
                            </div>
                          ) : (
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getDetailLineStatusInfo(detail.status).color}`}
                            >
                              {getDetailLineStatusInfo(detail.status).label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground">
                          {new Intl.NumberFormat('vi-VN').format(detail.unit_price)}
                        </td>
                        {onPrintItemBarcode ? (
                          <td className="px-3 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => onPrintItemBarcode(order, rowIdx + 1)}
                              className="inline-flex p-2 rounded-md text-info hover:bg-info/10 transition-colors"
                              title="In tem barcode món này"
                            >
                              <Printer size={16} className="scale-90" />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={onPrintItemBarcode ? 6 : 5} className="px-6 py-8 text-center text-muted-foreground italic">Không có chi tiết sản phẩm</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border">
              {order.details && order.details.length > 0 ? (
                order.details.map((detail: OrderDetail, rowIdx: number) => (
                  <div key={detail.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-foreground text-sm">{detail.item_name}</p>
                      <div className="flex items-start gap-2 shrink-0">
                        <p className="font-black text-primary text-sm">{new Intl.NumberFormat('vi-VN').format(detail.unit_price)}đ</p>
                        {onPrintItemBarcode ? (
                          <button
                            type="button"
                            onClick={() => onPrintItemBarcode(order, rowIdx + 1)}
                            className="p-1.5 rounded-md text-info hover:bg-info/10 transition-colors"
                            title="In tem barcode món này"
                          >
                            <Printer size={16} className="scale-90" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {detail.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
                    )}
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        Trạng thái món
                      </p>
                      {canEditLineStatus ? (
                        <div className="relative">
                          <select
                            value={detail.status}
                            disabled={savingLineId !== null}
                            onChange={(e) => {
                              void handleLineStatusChange(
                                detail,
                                e.target.value,
                              );
                            }}
                            className={lineStatusSelectClass}
                            aria-label={`Trạng thái ${detail.item_name}`}
                          >
                            {orderDetailStatusSelectOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            aria-hidden
                          />
                        </div>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getDetailLineStatusInfo(detail.status).color}`}
                        >
                          {getDetailLineStatusInfo(detail.status).label}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground italic text-xs">Không có chi tiết sản phẩm</div>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="vuexy-card !shadow-none border border-border bg-transparent overflow-hidden">
            <div className="bg-muted/5 px-4 md:px-6 py-3 md:py-4 border-b border-border">
              <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <DollarSign size={12} className="md:w-[14px] md:h-[14px]" /> Lịch sử thanh toán
              </h6>
            </div>
            <div className="px-4 md:px-6 py-4 space-y-3 md:space-y-4">
              {order.payments && order.payments.length > 0 ? (
                order.payments.map((payment: Payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-2 md:p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                        {getPaymentMethodInfo(payment.payment_method).icon}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs md:text-sm">{getPaymentMethodInfo(payment.payment_method).label}</p>
                        <p className="text-[9px] md:text-[10px] text-muted-foreground">
                          {new Date(payment.payment_time).toLocaleDateString('vi-VN')} - {new Date(payment.payment_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-success text-xs md:text-sm">
                        +{new Intl.NumberFormat('vi-VN').format(payment.amount)}đ
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-muted-foreground italic text-[10px] md:text-sm">Chưa có giao dịch thanh toán nào</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">Không tìm thấy dữ liệu đơn hàng.</div>
      )}
    </Modal>

    <Modal
      isOpen={deliverOpen && !!order}
      onClose={() => setDeliverOpen(false)}
      title={
        order
          ? `Xác nhận trả đồ · #${String(order.id).padStart(5, '0')}`
          : 'Xác nhận trả đồ'
      }
      stackOnTop
    >
      {order && (
        <div className="space-y-4">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                Đơn #{String(order.id).padStart(5, '0')}
              </span>
              <span className="text-sm font-bold text-foreground">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(order.total_amount)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <UserCheck size={14} />
              <span className="font-medium">
                {order.customer?.name || 'Vãng lai'}
              </span>
              {order.customer?.phone && (
                <span className="text-muted-foreground">
                  — {order.customer.phone}
                </span>
              )}
            </div>
            {detailDebt > 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-xs font-bold text-warning leading-relaxed">
                  Còn nợ{' '}
                  {new Intl.NumberFormat('vi-VN').format(detailDebt)}đ. Sau khi
                  xác nhận, trạng thái đơn:{' '}
                  <span className="text-foreground">
                    {resolveStatusWhenMarkingDelivered(order) === 'DeliveredOwing'
                      ? 'Trả thiếu tiền'
                      : 'Đã trả đồ'}
                  </span>
                  .
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Xác nhận đã giao đồ cho khách? Hệ thống ghi nhận thời điểm trả đồ
              và cập nhật trạng thái đơn tương ứng.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeliverOpen(false)}
              disabled={isPendingUpdateOrder}
              className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDeliver()}
              disabled={isPendingUpdateOrder}
              className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPendingUpdateOrder ? (
                'Đang xử lý...'
              ) : (
                <>
                  <PackageCheck size={16} />
                  Xác nhận trả đồ
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>

    {toast && (
      <Toast message={toast.message} type={toast.type} onClose={hideToast} />
    )}
    </>
  );
};
