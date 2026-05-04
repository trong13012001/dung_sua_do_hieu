/**
 * Map each route to permission(s). User needs at least one to see the link.
 * Use '*' for admin-only or always-visible (e.g. profile).
 */
/** Quyền vào màn Đơn hàng — khớp `ROUTE_PERMISSIONS['/orders']`. */
export const ORDERS_ROUTE_ACCESS = ["view_orders", "create_order"] as const;

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
    "/dashboard": ["view_dashboard"],
    "/pos": ["create_order"],
    "/orders": [...ORDERS_ROUTE_ACCESS],
    "/returns": ["view_returns", "update_order_status"],
    "/tasks": ["view_tasks", "update_tasks"],
    "/my-tasks": ["view_tasks", "update_tasks"],
    "/customers": ["view_customers", "manage_customers"],
    "/employees": ["manage_users"],
    "/roles": ["manage_roles"],
    "/permissions": ["manage_permissions"],
    "/settings": ["manage_settings"],
    "/profile": [],
};

export function canAccessRoute(permissions: string[], path: string): boolean {
    const required = ROUTE_PERMISSIONS[path];
    if (required == null) return true;
    if (required.length === 0) return true;
    return required.some((p) => permissions.includes(p));
}
