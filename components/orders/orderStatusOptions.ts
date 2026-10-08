/** Lựa chọn trạng thái đơn trong form "Cập nhật đơn" (nhãn riêng của form, khác nhãn badge). */
export const ORDER_STATUS_OPTIONS = [
  { value: 'New', label: 'Mới' },
  { value: 'In Progress', label: 'Đang xử lý' },
  { value: 'Ready', label: 'Đã xong' },
  { value: 'Paid', label: 'Đã thanh toán' },
  { value: 'Delivered', label: 'Đã trả đồ' },
  { value: 'DeliveredOwing', label: 'Trả thiếu tiền' },
  { value: 'Completed', label: 'Hoàn thành' },
] as const;

/** value → nhãn của các lựa chọn trên (danh sách /orders cũng dùng nhãn này). */
export const ORDER_STATUS_OPTION_LABEL: Record<string, string> = Object.fromEntries(
  ORDER_STATUS_OPTIONS.map((o) => [o.value, o.label]),
);
