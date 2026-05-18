import { Order } from "@/lib/types";

export type CanPrintInvoiceResult =
    | { ok: true }
    | { ok: false; message: string };

/** Kiểm tra đơn đủ điều kiện in phiếu thanh toán. */
export function canPrintInvoice(order: Order): CanPrintInvoiceResult {
    const hasCustomer =
        order.customer_id != null ||
        Boolean(order.customer?.name?.trim());
    if (!hasCustomer) {
        return { ok: false, message: "Chưa có khách hàng, không thể in" };
    }
    if (!order.return_time) {
        return {
            ok: false,
            message: "Vui lòng nhập ngày hẹn trả đồ trước khi in",
        };
    }
    if (!order.details?.length) {
        return {
            ok: false,
            message: "Đơn chưa có sản phẩm, không thể in phiếu",
        };
    }
    return { ok: true };
}

/** Chuyển return_time ISO sang yyyy-MM-dd cho input type="date". */
export function returnTimeToDateInputValue(
    returnTime: string | null | undefined,
): string {
    if (!returnTime) return "";
    const d = new Date(returnTime);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

/** Chuyển yyyy-MM-dd sang return_time ISO (16:00 VN, giống POS). */
export function dateInputToReturnTime(dateStr: string): string | null {
    const trimmed = dateStr.trim();
    if (!trimmed) return null;
    const combined = new Date(`${trimmed}T16:00:00`);
    if (Number.isNaN(combined.getTime())) return null;
    return combined.toISOString();
}
