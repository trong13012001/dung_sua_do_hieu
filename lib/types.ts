export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    total_debt: number;
    created_at: string;
    updated_at: string;
}

export interface Role {
    id: number;
    name: string;
    created_at: string;
}

export interface Permission {
    id: number;
    name: string;
    created_at: string;
}

export interface RolePermission {
    role_id: number;
    permission_id: number;
}

export interface User {
    id: number;
    name: string;
    email?: string | null;
    phone: string | null;
    id_card?: string | null;
    address?: string | null;
    role_id: number | null;
    created_at: string;
    updated_at: string;
    role?: Role;
}

export interface OrderDetail {
    id: number;
    order_id: number;
    item_name: string;
    description: string | null;
    unit_price: number;
    status: "New" | "In Progress" | "Ready" | "Completed";
    assigned_tailor_id: string | null;
    created_at: string;
    updated_at: string;

    tailor?: Partial<User> | null;
    order?: Partial<Order> | null;
}

export interface Payment {
    id: number;
    order_id: number;
    amount: number;
    payment_time: string;
    payment_method: "Cash" | "Card" | "Transfer";
}

export interface Order {
    id: number;
    customer_id: number;
    total_amount: number;
    paid_amount: number;
    status: "New" | "In Progress" | "Ready" | "Delivered" | "Completed";
    receive_time: string;
    return_time: string | null;
    created_at: string;
    updated_at: string;
    /** Mã 11 số giống WPF (yymmdd + thứ tự ngày + 00); null nếu DB chưa migrate */
    transaction_code?: string | null;
    /** Tên nhân viên tạo đơn (dùng cho in/preview khi có chọn trên POS). */
    created_by_name?: string | null;

    customer?: Partial<Customer>;
    details?: OrderDetail[];
    payments?: Payment[];
}

export interface MonthlyRevenue {
    month: string;
    revenue: number;
}

/** Chọn kỳ xem thống kê trên dashboard */
export type DashboardPeriodMode = "day" | "month" | "year";

export interface DashboardPeriodSelection {
    mode: DashboardPeriodMode;
    /** Ngày: YYYY-MM-DD, tháng: YYYY-MM, năm: YYYY */
    value: string;
}

/** Một dòng hàng (order_detail) kèm ngữ cảnh đơn / khách */
export interface DashboardPeriodItemRow {
    id: number;
    order_id: number;
    item_name: string;
    status: string;
    created_at: string;
    customer_name: string;
    /** Chỉ có khi là hàng theo ngày trả đơn */
    return_time?: string | null;
}

export interface DashboardPeriodOrderRow {
    id: number;
    created_at: string;
    return_time: string | null;
    status: string;
    customer_name: string;
    total_amount: number;
}

export interface DashboardPeriodDebtOrderRow
    extends DashboardPeriodOrderRow {
    paid_amount: number;
    unpaid_amount: number;
}

export interface DashboardPeriodAnalytics {
    ordersCreatedCount: number;
    ordersReturnedCount: number;
    itemsCreatedCount: number;
    itemsReturnedCount: number;
    /** Tổng tiền thu trong kỳ (bảng payments, theo payment_time) */
    periodRevenue: number;
    /**
     * Tổng dư chưa thu trên các đơn có ngày lập trong kỳ
     * (max(0, total_amount − paid_amount) cộng dồn).
     */
    periodUnpaidOnOrdersCreated: number;
    ordersCreated: DashboardPeriodOrderRow[];
    ordersDebt: DashboardPeriodDebtOrderRow[];
    ordersReturned: DashboardPeriodOrderRow[];
    itemsCreated: DashboardPeriodItemRow[];
    itemsReturned: DashboardPeriodItemRow[];
}

export interface OrderLog {
    id: number;
    order_id: number;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    updated_by: string | null;
    created_at: string;
    user?: Partial<User>;
}
