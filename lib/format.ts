/**
 * Định dạng tiền / số dùng chung. Tạo Intl.NumberFormat một lần ở module —
 * tạo mới trong mỗi lần render của mỗi dòng danh sách là tốn vô ích.
 */
const VND_CURRENCY = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const VND_NUMBER = new Intl.NumberFormat('vi-VN');

/** 150000 → "150.000 ₫" */
export function formatVnd(amount: number | string | null | undefined): string {
  return VND_CURRENCY.format(Number(amount ?? 0));
}

/** 150000 → "150.000" */
export function formatNumber(amount: number | string | null | undefined): string {
  return VND_NUMBER.format(Number(amount ?? 0));
}
