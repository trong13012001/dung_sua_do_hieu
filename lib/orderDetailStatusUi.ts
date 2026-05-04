/** Trạng thái dòng `order_details` (món trong đơn) — khác trạng thái đơn (`orders`). */

/** Giá trị DB + nhãn form (đồng bộ màn Đơn hàng / modal chi tiết). */
export const orderDetailStatusSelectOptions = [
    { value: "New", label: "Mới" },
    { value: "In Progress", label: "Đang làm" },
    { value: "Ready", label: "Đã xong (chờ giao)" },
    { value: "Completed", label: "Xong việc (thợ)" },
    {
        value: "Delivered",
        label: "Đã giao món (đã thu / đối chiếu xong)",
    },
    {
        value: "DeliveredOwing",
        label: "Đã giao món (nợ món — thu sau trên đơn)",
    },
] as const;

export function orderDetailStatusLabelVi(status: string): string {
    const m: Record<string, string> = {
        New: "Mới",
        "In Progress": "Đang làm",
        Ready: "Đã xong (chờ giao)",
        Completed: "Xong việc (thợ)",
        Delivered: "Đã giao món",
        DeliveredOwing: "Đã giao — nợ món",
    };
    return m[status] ?? status;
}

export function orderDetailStatusBadgeClass(status: string): string {
    switch (status) {
        case "New":
            return "bg-info/10 text-info";
        case "In Progress":
            return "bg-warning/10 text-warning";
        case "Ready":
            return "bg-success/10 text-success";
        case "Completed":
            return "bg-secondary/10 text-secondary";
        case "Delivered":
            return "bg-primary/10 text-primary";
        case "DeliveredOwing":
            return "bg-orange-500/15 text-orange-800 dark:text-orange-300";
        default:
            return "bg-muted/10 text-muted-foreground";
    }
}
