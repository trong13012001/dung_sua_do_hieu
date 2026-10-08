import type { Order } from '@/lib/types';

/** Nhãn dùng cho danh sách đơn và file Excel xuất ra (giữ nguyên chữ như trước). */

export const ORDER_STATUS_EXPORT_LABEL: Record<string, string> = {
  New: 'Mới',
  'In Progress': 'Đang làm',
  Ready: 'Đã xong',
  Paid: 'Đã thanh toán',
  Delivered: 'Đã trả đồ',
  DeliveredOwing: 'Trả thiếu tiền',
  Completed: 'Hoàn thành',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  Cash: 'Tiền mặt',
  Card: 'Thẻ',
  Transfer: 'Chuyển khoản',
};

export function getLatestPaymentMethod(order: Order): string {
  const latest = (order.payments || [])
    .slice()
    .sort((a, b) => new Date(b.payment_time).getTime() - new Date(a.payment_time).getTime())[0];
  if (!latest?.payment_method) return '';
  return PAYMENT_METHOD_LABEL[latest.payment_method] || latest.payment_method;
}

export function getDeliveryStatusLabel(order: Order): string {
  if (order.status === 'Delivered' || order.status === 'Completed') return 'Đã trả đồ';
  if (order.status === 'DeliveredOwing') return 'Đã trả đồ (còn nợ)';
  return '';
}
