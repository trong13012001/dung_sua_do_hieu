import type { DashboardPeriodMode } from '@/lib/types';

/** Nhãn riêng của Dashboard (giữ nguyên chữ như trước, vd. "Đã giao" cho Delivered). */
const STATUS_LABEL: Record<string, string> = {
  New: 'Mới',
  'In Progress': 'Đang xử lý',
  Ready: 'Đã xong',
  Paid: 'Đã thanh toán',
  Delivered: 'Đã giao',
  DeliveredOwing: 'Trả thiếu tiền',
  Completed: 'Hoàn thành',
};

const STATUS_COLOR: Record<string, string> = {
  New: 'bg-info/10 text-info',
  'In Progress': 'bg-warning/10 text-warning',
  Ready: 'bg-success/10 text-success',
  Paid: 'bg-emerald-600/12 text-emerald-800',
  Delivered: 'bg-primary/10 text-primary',
  DeliveredOwing: 'bg-orange-500/15 text-orange-800',
  Completed: 'bg-success/10 text-success',
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;
export const statusColor = (s: string) => STATUS_COLOR[s] ?? 'bg-secondary/10 text-secondary';

export function paymentMethodLabel(m?: 'Cash' | 'Card' | 'Transfer' | null) {
  if (m === 'Cash') return 'Tiền mặt';
  if (m === 'Card') return 'Thẻ';
  if (m === 'Transfer') return 'Chuyển khoản';
  return '—';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function todayYMD() {
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
}

export function currentYM() {
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}`;
}

export function periodLabelVi(mode: DashboardPeriodMode, value: string) {
  if (mode === 'day') {
    const [y, m, d] = value.split('-').map((x) => Number.parseInt(x, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return value;
    return `${pad2(d)}/${pad2(m)}/${y}`;
  }
  if (mode === 'month') {
    const [y, m] = value.split('-').map((x) => Number.parseInt(x, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m)) return value;
    return `Tháng ${m}/${y}`;
  }
  return `Năm ${value}`;
}

export const orderCode = (id: number | string) => `#${String(id).padStart(5, '0')}`;
