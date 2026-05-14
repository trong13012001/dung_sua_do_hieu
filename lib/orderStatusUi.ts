/** Hiển thị trạng thái đơn hàng (bảng `orders.status`) — đồng bộ toàn app. */

/** Thứ tự chip lọc / phân tích theo kỳ (dashboard). */
export const ORDER_STATUS_FILTER_SEQUENCE = [
    "New",
    "In Progress",
    "Ready",
    "Paid",
    "Delivered",
    "DeliveredOwing",
    "Completed",
] as const;

/** Đơn chưa giao cho khách ở quầy — cho phép nút "Trả đồ" dù chưa thu / chưa xong hết món (giống phần mềm cũ). */
export const ORDER_STATUSES_ALLOW_COUNTER_DELIVERY = [
    "New",
    "In Progress",
    "Ready",
    "Paid",
] as const;

export function canMarkOrderDeliveredAtCounter(status: string): boolean {
    return (ORDER_STATUSES_ALLOW_COUNTER_DELIVERY as readonly string[]).includes(
        status,
    );
}

/**
 * Khi ghi nhận "đã trả đồ": đã có thu một phần nhưng chưa đủ → Trả thiếu tiền;
 * còn lại → Đã trả đồ (đủ hoặc chưa thu đồng nào).
 */
export function resolveStatusWhenMarkingDelivered(order: {
    paid_amount?: number | null;
    total_amount?: number | null;
}): "Delivered" | "DeliveredOwing" {
    const paid = Number(order.paid_amount ?? 0);
    const total = Number(order.total_amount ?? 0);
    if (paid > 0 && paid < total) return "DeliveredOwing";
    return "Delivered";
}

export function orderStatusLabelVi(status: string): string {
    const m: Record<string, string> = {
        New: "Mới",
        "In Progress": "Đang làm",
        Ready: "Đã xong",
        Paid: "Đã thanh toán",
        Delivered: "Đã trả đồ",
        DeliveredOwing: "Trả thiếu tiền",
        Completed: "Hoàn thành",
    };
    return m[status] ?? status;
}

export function orderStatusBadgeClass(status: string): string {
    switch (status) {
        case "New":
            return "bg-info/10 text-info";
        case "In Progress":
            return "bg-warning/10 text-warning";
        case "Ready":
            return "bg-success/10 text-success";
        case "Paid":
            return "bg-emerald-600/12 text-emerald-800 dark:text-emerald-400";
        case "Delivered":
            return "bg-primary/10 text-primary";
        case "DeliveredOwing":
            return "bg-orange-500/15 text-orange-800 dark:text-orange-300";
        case "Completed":
            return "bg-secondary/10 text-secondary";
        default:
            return "bg-muted/10 text-muted-foreground";
    }
}
