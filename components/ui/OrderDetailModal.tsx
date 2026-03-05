'use client';

import React from 'react';
import { useGetOrder } from '@/hooks/order/useGetOrder';
import { Modal } from '@/components/ui/Modal';
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
  AlertCircle
} from 'lucide-react';
import { OrderDetail, Payment } from '@/lib/types';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | string | null;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
}) => {
  const { data: order, isLoading, error } = useGetOrder(orderId);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'New':
        return { label: 'Mới', color: 'bg-info/10 text-info', icon: <AlertCircle size={16} /> };
      case 'In Progress':
        return { label: 'Đang xử lý', color: 'bg-warning/10 text-warning', icon: <Clock size={16} /> };
      case 'Ready':
        return { label: 'Sẵn sàng', color: 'bg-success/10 text-success', icon: <CheckCircle2 size={16} /> };
      case 'Completed':
        return { label: 'Hoàn thành', color: 'bg-secondary/10 text-secondary', icon: <CheckCircle2 size={16} /> };
      default:
        return { label: status, color: 'bg-muted/10 text-muted-foreground', icon: <Package size={16} /> };
    }
  };

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết đơn hàng: #${orderId}`}
      maxWidth="max-w-3xl"
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
            <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0">
              <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Ngày nhận</p>
              <div className="flex items-center gap-1.5 font-bold text-foreground text-xs md:text-sm">
                <Calendar size={14} className="text-primary md:w-4 md:h-4" />
                <span>{new Date(order.receive_time).toLocaleDateString('vi-VN')}</span>
                <span className="text-muted-foreground opacity-50 ml-1 font-medium">{new Date(order.receive_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
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
              <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary mb-4 md:mb-6">Thanh toán</h6>
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
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 md:pt-2">
                  <span className="text-xs md:text-sm font-bold text-primary uppercase tracking-wider">Còn lại</span>
                  <span className="text-xl md:text-2xl font-black text-primary">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount - (order.paid_amount || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details List (Responsive: Table on md+, Cards on <md) */}
          <div className="vuexy-card !shadow-none border border-border bg-transparent overflow-hidden">
            <div className="bg-muted/5 px-4 md:px-6 py-3 md:py-4 border-b border-border">
              <h6 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Package size={12} className="md:w-[14px] md:h-[14px]" /> Sản phẩm & Dịch vụ
              </h6>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/5">
                    <th className="px-6 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Tên mục</th>
                    <th className="px-6 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Mô tả</th>
                    <th className="px-6 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Trạng thái</th>
                    <th className="px-6 py-3 text-right font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Đơn giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.details && order.details.length > 0 ? (
                    order.details.map((detail: OrderDetail) => (
                      <tr key={detail.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">{detail.item_name}</td>
                        <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{detail.description || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusInfo(detail.status).color}`}>
                            {getStatusInfo(detail.status).label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground">
                          {new Intl.NumberFormat('vi-VN').format(detail.unit_price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">Không có chi tiết sản phẩm</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border">
              {order.details && order.details.length > 0 ? (
                order.details.map((detail: OrderDetail) => (
                  <div key={detail.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-foreground text-sm">{detail.item_name}</p>
                      <p className="font-black text-primary text-sm">{new Intl.NumberFormat('vi-VN').format(detail.unit_price)}đ</p>
                    </div>
                    {detail.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
                    )}
                    <div className="flex justify-start">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusInfo(detail.status).color}`}>
                        {getStatusInfo(detail.status).label}
                      </span>
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
  );
};
