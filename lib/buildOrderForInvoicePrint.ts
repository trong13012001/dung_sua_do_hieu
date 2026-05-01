import type { Customer, Order, OrderDetail, Role, User } from "@/lib/types";

/** Dòng sản phẩm POS sau khi tạo đơn — dùng để dựng Order cho InvoicePrint. */
export type PosLikeLine = {
    name: string;
    price: number;
    description: string;
    assigned_tailor_id: string;
};

/**
 * Ghép đơn vừa insert + khách + dòng POS thành Order đủ cho InvoicePrint
 * (API create chỉ trả order row, chưa có details/customer join).
 */
export function buildOrderForInvoicePrint(
    created: Order,
    customer: Customer,
    lines: readonly PosLikeLine[],
    tailors: readonly (User & { role: Role | null })[],
    creatorName?: string | null,
): Order {
    const tailorById: Record<string, { name: string }> = {};
    for (const t of tailors) {
        tailorById[String(t.id)] = { name: t.name };
    }
    const details: OrderDetail[] = lines.map((item, i) => {
        const tid = item.assigned_tailor_id?.trim();
        return {
            id: -10001 - i,
            order_id: created.id,
            item_name: item.name.trim(),
            description: item.description?.trim() || null,
            unit_price: Number(item.price),
            status: "New",
            assigned_tailor_id: tid || null,
            created_at: created.created_at,
            updated_at: created.updated_at,
            tailor: tid ? { name: tailorById[tid]?.name ?? "—" } : null,
        };
    });
    return {
        ...created,
        created_by_name: creatorName ?? created.created_by_name ?? null,
        customer: {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
        },
        details,
    };
}
