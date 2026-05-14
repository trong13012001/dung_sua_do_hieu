import { supabase } from "@/lib/supabase";
import {
    useQuery,
    useMutation,
    useQueryClient,
    useInfiniteQuery,
    type InfiniteData,
} from "@tanstack/react-query";
import { Order, OrderDetail } from "@/lib/types";
import { insertOrderLog } from "@/api/orderLogs";

const PAGE_SIZE = 25;

/** Dòng cache của useAllOrderItems / useOrderItems (bảng Công việc) */
type CachedOrderTaskRow = {
    id: number;
    order_id: number;
    item_name: string;
    description?: string | null;
    unit_price: number;
    status: string;
    assigned_tailor_id: string | null;
    tailor?: { id: string; name: string } | null;
    orderNumber: number;
    customerName: string;
    orderCreatedAt: string;
    orderStatus?: string;
    created_at?: string;
};

/** Biến số mutation cập nhật order_detail (gồm gợi ý tên thợ cho cache Công việc). */
export type UpdateOrderDetailVariables = {
    id: number;
    detail: Partial<OrderDetail>;
    updated_by?: string | null;
    /** Khi đổi assigned_tailor_id: đặt tên thợ hiển thị ngay (optimistic / khớp DB). */
    assignee_tailor?: { id: string; name: string } | null;
};

function applyDetailPatchToTaskRows(
    rows: CachedOrderTaskRow[],
    detailId: number,
    patch: Partial<OrderDetail>,
    assigneeTailorHint?: { id: string; name: string } | null,
): CachedOrderTaskRow[] {
    return rows.map((row) => {
        if (row.id !== detailId) return row;
        const next: CachedOrderTaskRow = { ...row };
        (Object.keys(patch) as (keyof OrderDetail)[]).forEach((k) => {
            const v = patch[k];
            if (v !== undefined) (next as Record<string, unknown>)[k as string] = v;
        });
        if ("assigned_tailor_id" in patch) {
            const v = patch.assigned_tailor_id;
            if (v == null || v === "") {
                next.assigned_tailor_id = null;
                next.tailor = null;
            } else {
                const sid = String(v);
                next.assigned_tailor_id = sid;
                const hintOk =
                    assigneeTailorHint != null &&
                    assigneeTailorHint.id === sid;
                next.tailor = hintOk ? assigneeTailorHint : null;
            }
        }
        return next;
    });
}

async function fetchTailorForTaskRow(
    assignedTailorId: string | null | undefined,
): Promise<{ id: string; name: string } | null> {
    if (assignedTailorId == null || assignedTailorId === "") return null;
    const id = String(assignedTailorId);
    const { data: u, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", id)
        .single();
    if (error || !u) return null;
    return { id: String(u.id), name: u.name };
}

/** Kết quả mutation cập nhật dòng order_details + snapshot cha (tổng tiền, trạng thái). */
export type UpdateOrderDetailMutationData = {
    detail: OrderDetail;
    parent: Pick<Order, "total_amount" | "status" | "updated_at">;
    /** Tên thợ cho dòng detail (bảng Công việc / orders.details.tailor). */
    taskTailor: { id: string; name: string } | null;
};

function orderDetailTailorFromResolved(
    resolved: { id: string; name: string } | null,
): OrderDetail["tailor"] {
    if (!resolved) return null;
    return {
        id: resolved.id as unknown as number,
        name: resolved.name,
    };
}

function mergeCachedOrderDetailRow(
    existing: OrderDetail,
    incoming: OrderDetail,
    resolvedTailor?: { id: string; name: string } | null,
): OrderDetail {
    const inTid = incoming.assigned_tailor_id;
    const cleared = inTid == null || inTid === "";
    let tailor: OrderDetail["tailor"];
    if (cleared) {
        tailor = null;
    } else if (String(inTid) === String(existing.assigned_tailor_id ?? "")) {
        tailor =
            existing.tailor ??
            (resolvedTailor && String(resolvedTailor.id) === String(inTid)
                ? orderDetailTailorFromResolved(resolvedTailor)
                : null);
    } else {
        tailor =
            resolvedTailor && String(resolvedTailor.id) === String(inTid)
                ? orderDetailTailorFromResolved(resolvedTailor)
                : null;
    }
    return {
        ...existing,
        ...incoming,
        tailor,
    };
}

function patchOrderInInfinitePages(
    data: InfiniteData<Order[]>,
    orderId: number,
    patch: Partial<Order>,
): InfiniteData<Order[]> {
    return {
        ...data,
        pages: data.pages.map((page) =>
            page.map((o) => (o.id === orderId ? { ...o, ...patch } : o)),
        ),
    };
}

function setOrderStatusInInfinitePages(
    data: InfiniteData<Order[]>,
    orderId: number,
    status: Order["status"],
): InfiniteData<Order[]> {
    return {
        ...data,
        pages: data.pages.map((page) =>
            page.map((o) =>
                o.id === orderId ? { ...o, status } : o,
            ),
        ),
    };
}

function patchOrdersArrayWithDetail(
    orders: Order[],
    detail: OrderDetail,
    parent: Pick<Order, "total_amount" | "status" | "updated_at">,
    taskTailor: { id: string; name: string } | null,
): Order[] {
    return orders.map((o) => {
        if (o.id !== detail.order_id) return o;
        if (!o.details?.some((d) => d.id === detail.id)) return o;
        return {
            ...o,
            total_amount: parent.total_amount,
            status: parent.status as Order["status"],
            updated_at: parent.updated_at,
            details: o.details.map((d) =>
                d.id === detail.id
                    ? mergeCachedOrderDetailRow(d, detail, taskTailor)
                    : d,
            ),
        };
    });
}

function taskRowPatchFromDetail(d: OrderDetail): Partial<OrderDetail> {
    return {
        item_name: d.item_name,
        description: d.description,
        unit_price: d.unit_price,
        status: d.status,
        assigned_tailor_id: d.assigned_tailor_id,
        handed_over_at: d.handed_over_at ?? null,
    };
}

export type EnrichOrdersOptions = {
    /**
     * Không gọi order_logs + không resolve created_by_name (màn danh sách không dùng).
     * Giảm ~2 round-trip Supabase mỗi lần tải trang đơn.
     */
    skipCreatedBy?: boolean;
};

async function enrichOrders(
    orders: any[],
    options?: EnrichOrdersOptions,
): Promise<Order[]> {
    if (!orders || orders.length === 0) return [];
    const skipCreatedBy = options?.skipCreatedBy === true;
    const orderIds = orders.map((o) => o.id);
    const customerIds = [
        ...new Set(orders.map((o) => o.customer_id).filter(Boolean)),
    ] as number[];
    const createdLogsPromise = skipCreatedBy
        ? Promise.resolve({
              data: [] as {
                  order_id: number;
                  updated_by: string | number | null;
                  created_at: string;
              }[],
              error: null,
          })
        : supabase
              .from("order_logs")
              .select("order_id, updated_by, created_at")
              .eq("action", "order_created")
              .in("order_id", orderIds)
              .order("created_at", { ascending: true });

    const [customersRes, detailsRes, paymentsRes, createdLogsRes] =
        await Promise.all([
        customerIds.length > 0
            ? supabase
                  .from("customers")
                  .select("id, name, phone, address")
                  .in("id", customerIds)
            : Promise.resolve({ data: [], error: null }),
        supabase
            .from("order_details")
            .select(
                "id, order_id, item_name, unit_price, description, status, assigned_tailor_id, handed_over_at, created_at, updated_at",
            )
            .in("order_id", orderIds),
        supabase
            .from("payments")
            .select("id, order_id, amount, payment_time, payment_method")
            .in("order_id", orderIds),
        createdLogsPromise,
        ]);
    if (customersRes.error) throw customersRes.error;
    if (detailsRes.error) throw detailsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (createdLogsRes.error) throw createdLogsRes.error;

    const customerMap: Record<
        number,
        {
            id: number;
            name: string;
            phone: string | null;
            address: string | null;
        }
    > = {};
    if (customersRes.data)
        for (const c of customersRes.data) customerMap[c.id] = c;
    const detailsByOrder: Record<number, any[]> = {};
    const tailorIds = new Set<string | number>();
    if (detailsRes.data) {
        for (const d of detailsRes.data) {
            if (!detailsByOrder[d.order_id]) detailsByOrder[d.order_id] = [];
            detailsByOrder[d.order_id].push(d);
            if (d.assigned_tailor_id != null)
                tailorIds.add(d.assigned_tailor_id);
        }
    }
    const paymentsByOrder: Record<number, any[]> = {};
    if (paymentsRes.data) {
        for (const p of paymentsRes.data) {
            if (!paymentsByOrder[p.order_id]) paymentsByOrder[p.order_id] = [];
            paymentsByOrder[p.order_id].push(p);
        }
    }

    const firstCreatorByOrder: Record<number, string> = {};
    const creatorIds = new Set<string | number>();
    if (!skipCreatedBy) {
        for (const log of createdLogsRes.data || []) {
            const oid = Number(log.order_id);
            if (!Number.isFinite(oid)) continue;
            if (firstCreatorByOrder[oid] != null) continue;
            const uid = log.updated_by;
            if (uid == null) continue;
            const sid = String(uid);
            firstCreatorByOrder[oid] = sid;
            creatorIds.add(uid);
        }
    }

    const allUserIds = new Set<string | number>([
        ...tailorIds,
        ...creatorIds,
    ]);
    const userNameById: Record<string, string> = {};
    if (allUserIds.size > 0) {
        const { data: users, error: usersErr } = await supabase
            .from("users")
            .select("id, name")
            .in("id", [...allUserIds]);
        if (usersErr) throw usersErr;
        for (const u of users || []) {
            userNameById[String(u.id)] = u.name;
        }
    }

    const tailorMap: Record<string, { id: string; name: string }> = {};
    for (const tid of tailorIds) {
        const sid = String(tid);
        const nm = userNameById[sid];
        if (nm) tailorMap[sid] = { id: sid, name: nm };
    }

    return orders.map((o) => ({
        ...o,
        created_by_name: skipCreatedBy
            ? null
            : (userNameById[firstCreatorByOrder[o.id] ?? ""] ?? null),
        customer: customerMap[o.customer_id] || null,
        details: (detailsByOrder[o.id] || []).map((d: any) => ({
            ...d,
            tailor: d.assigned_tailor_id
                ? tailorMap[String(d.assigned_tailor_id)] || null
                : null,
        })),
        payments: paymentsByOrder[o.id] || [],
    })) as Order[];
}

export type OrdersFilters = {
    start_date?: string;
    end_date?: string;
    status?: string;
    search?: string;
};

export type OrdersPageResult = {
    items: Order[];
    total: number;
    page: number;
    pageSize: number;
};

export function useOrders() {
    return useQuery({
        queryKey: ["orders"],
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        queryFn: async (): Promise<Order[]> => {
            const { data: orders, error } = await supabase
                .from("orders")
                .select(
                    "id, customer_id, total_amount, paid_amount, status, receive_time, return_time, transaction_code, created_at, updated_at",
                )
                .order("created_at", { ascending: false })
                .limit(100);
            if (error) throw error;
            return enrichOrders(orders || [], { skipCreatedBy: true });
        },
    });
}

export function useOrdersInfinite(filters: OrdersFilters) {
    return useInfiniteQuery({
        queryKey: [
            "orders-infinite",
            filters.start_date,
            filters.end_date,
            filters.status,
            filters.search,
        ],
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        initialPageParam: 0,
        getNextPageParam: (lastPage: Order[], _allPages) =>
            lastPage.length === PAGE_SIZE
                ? _allPages.length * PAGE_SIZE
                : undefined,
        queryFn: async ({ pageParam }): Promise<Order[]> => {
            let q = supabase
                .from("orders")
                .select(
                    "id, customer_id, total_amount, paid_amount, status, receive_time, return_time, transaction_code, created_at, updated_at",
                )
                .order("created_at", { ascending: false })
                .range(
                    pageParam as number,
                    (pageParam as number) + PAGE_SIZE - 1,
                );
            if (filters.start_date)
                q = q.gte("created_at", filters.start_date + "T00:00:00.000Z");
            if (filters.end_date)
                q = q.lte("created_at", filters.end_date + "T23:59:59.999Z");
            if (filters.status) q = q.eq("status", filters.status);
            if (filters.search) {
                const normalized = filters.search.trim();
                const digits = normalized.replaceAll(/\D/g, "");
                const clauses: string[] = [];
                if (digits.length > 0) {
                    const numericId = Number(digits);
                    if (Number.isFinite(numericId) && numericId > 0) {
                        clauses.push(`id.eq.${numericId}`);
                    }
                    clauses.push(`transaction_code.ilike.%${digits}%`);
                } else if (normalized.length > 0) {
                    clauses.push(`transaction_code.ilike.%${normalized}%`);
                }
                if (clauses.length > 0) {
                    q = q.or(clauses.join(","));
                }
            }
            const { data: orders, error } = await q;
            if (error) throw error;
            return enrichOrders(orders || [], { skipCreatedBy: true });
        },
    });
}

export function useOrdersPage(
    filters: OrdersFilters,
    page: number,
    pageSize = PAGE_SIZE,
) {
    return useQuery({
        queryKey: [
            "orders-page",
            filters.start_date,
            filters.end_date,
            filters.status,
            filters.search,
            page,
            pageSize,
        ],
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        queryFn: async (): Promise<OrdersPageResult> => {
            const safePage = Number.isFinite(page) && page > 0 ? page : 1;
            const from = (safePage - 1) * pageSize;
            const to = from + pageSize - 1;
            let q = supabase
                .from("orders")
                .select(
                    "id, customer_id, total_amount, paid_amount, status, receive_time, return_time, transaction_code, created_at, updated_at",
                    { count: "exact" },
                )
                .order("created_at", { ascending: false })
                .range(from, to);
            if (filters.start_date)
                q = q.gte("created_at", filters.start_date + "T00:00:00.000Z");
            if (filters.end_date)
                q = q.lte("created_at", filters.end_date + "T23:59:59.999Z");
            if (filters.status) q = q.eq("status", filters.status);
            if (filters.search) {
                const normalized = filters.search.trim();
                const digits = normalized.replaceAll(/\D/g, "");
                const clauses: string[] = [];
                if (digits.length > 0) {
                    const numericId = Number(digits);
                    if (Number.isFinite(numericId) && numericId > 0) {
                        clauses.push(`id.eq.${numericId}`);
                    }
                    clauses.push(`transaction_code.ilike.%${digits}%`);
                } else if (normalized.length > 0) {
                    clauses.push(`transaction_code.ilike.%${normalized}%`);
                }
                if (clauses.length > 0) {
                    q = q.or(clauses.join(","));
                }
            }
            const { data: orders, error, count } = await q;
            if (error) throw error;
            const items = await enrichOrders(orders || [], { skipCreatedBy: true });
            return {
                items,
                total: count || 0,
                page: safePage,
                pageSize,
            };
        },
    });
}

export async function fetchOrdersForExport(
    filters: OrdersFilters,
): Promise<Order[]> {
    let q = supabase
        .from("orders")
        .select(
            "id, customer_id, total_amount, paid_amount, status, receive_time, return_time, transaction_code, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(5000);
    if (filters.start_date)
        q = q.gte("created_at", filters.start_date + "T00:00:00.000Z");
    if (filters.end_date)
        q = q.lte("created_at", filters.end_date + "T23:59:59.999Z");
    if (filters.status) q = q.eq("status", filters.status);
    const { data: orders, error } = await q;
    if (error) throw error;
    return enrichOrders(orders || [], { skipCreatedBy: true });
}

export function useOrderItems(tailorId?: string | number | null) {
    return useQuery({
        queryKey: ["order-items", tailorId],
        enabled: tailorId != null && tailorId !== "",
        queryFn: async () => {
            // Step 1: fetch details for this tailor (assigned_tailor_id is UUID)
            const { data: details, error } = await supabase
                .from("order_details")
                .select(
                    "id, order_id, item_name, description, unit_price, status, assigned_tailor_id, created_at",
                )
                .eq("assigned_tailor_id", tailorId!)
                .in("status", ["New", "In Progress", "Ready", "Completed"])
                .order("created_at", { ascending: false })
                .limit(100);
            if (error) throw error;
            if (!details || details.length === 0) return [];

            // Step 2: fetch parent orders + customers
            const orderIds = [...new Set(details.map((d) => d.order_id))];
            const { data: orders } = await supabase
                .from("orders")
                .select("id, created_at, customer_id")
                .in("id", orderIds);
            const customerIds = [
                ...new Set(
                    (orders || []).map((o) => o.customer_id).filter(Boolean),
                ),
            ] as number[];
            const { data: customers } =
                customerIds.length > 0
                    ? await supabase
                          .from("customers")
                          .select("id, name")
                          .in("id", customerIds)
                    : { data: [] };

            const customerMap: Record<number, string> = {};
            if (customers)
                for (const c of customers) customerMap[c.id] = c.name;
            const orderMap: Record<number, any> = {};
            if (orders)
                for (const o of orders)
                    orderMap[o.id] = {
                        ...o,
                        customerName: customerMap[o.customer_id] || "Vãng lai",
                    };

            return details.map((d: any) => ({
                ...d,
                orderNumber: d.order_id,
                customerName: orderMap[d.order_id]?.customerName || "Vãng lai",
                orderCreatedAt: orderMap[d.order_id]?.created_at || "",
            }));
        },
    });
}

export function useAllOrderItems() {
    return useQuery({
        queryKey: ["all-order-items"],
        queryFn: async () => {
            const { data: details, error } = await supabase
                .from("order_details")
                .select(
                    "id, order_id, item_name, description, unit_price, status, assigned_tailor_id, created_at",
                )
                .in("status", ["New", "In Progress", "Ready", "Completed"])
                .order("created_at", { ascending: false })
                .limit(500);
            if (error) throw error;
            if (!details || details.length === 0) return [];

            // Step 2: fetch related orders + customers + tailors in parallel
            const orderIds = [...new Set(details.map((d) => d.order_id))];
            const tailorIds = [
                ...new Set(
                    details
                        .map((d: any) => d.assigned_tailor_id)
                        .filter(Boolean),
                ),
            ];

            const [ordersRes, tailorsRes] = await Promise.all([
                supabase
                    .from("orders")
                    .select("id, status, created_at, customer_id")
                    .in("id", orderIds),
                tailorIds.length > 0
                    ? supabase
                          .from("users")
                          .select("id, name")
                          .in("id", tailorIds)
                    : Promise.resolve({ data: [] }),
            ]);

            const customerIds = [
                ...new Set(
                    (ordersRes.data || [])
                        .map((o) => o.customer_id)
                        .filter(Boolean),
                ),
            ] as number[];
            const { data: customers } =
                customerIds.length > 0
                    ? await supabase
                          .from("customers")
                          .select("id, name")
                          .in("id", customerIds)
                    : { data: [] };

            const customerMap: Record<number, string> = {};
            if (customers)
                for (const c of customers) customerMap[c.id] = c.name;
            const orderMap: Record<number, any> = {};
            if (ordersRes.data)
                for (const o of ordersRes.data)
                    orderMap[o.id] = {
                        ...o,
                        customerName: customerMap[o.customer_id] || "Vãng lai",
                    };
            const tailorMap: Record<string, { id: string; name: string }> = {};
            if (tailorsRes.data)
                for (const t of tailorsRes.data)
                    tailorMap[String(t.id)] = {
                        id: String(t.id),
                        name: t.name,
                    };

            return details.map((d: any) => ({
                ...d,
                tailor: d.assigned_tailor_id
                    ? tailorMap[String(d.assigned_tailor_id)] || null
                    : null,
                orderNumber: d.order_id,
                customerName: orderMap[d.order_id]?.customerName || "Vãng lai",
                orderCreatedAt: orderMap[d.order_id]?.created_at || "",
                orderStatus: orderMap[d.order_id]?.status || "",
            }));
        },
    });
}

export function useCreateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            order,
            items,
            updated_by,
            initial_payment,
        }: {
            order: Partial<Order>;
            items: {
                name: string;
                price: number;
                description: string;
                assigned_tailor_id?: string | null;
            }[];
            updated_by?: string | null;
            /** Thu ngay khi lập đơn (POS): ghi `payments` + cập nhật `paid_amount` giống màn thanh toán. */
            initial_payment?: {
                amount: number;
                payment_method: "Cash" | "Card" | "Transfer";
            } | null;
        }) => {
            const { data: orderData, error: orderError } = await supabase
                .from("orders")
                .insert(order)
                .select()
                .single();
            if (orderError) throw orderError;

            if (items.length > 0) {
                const details = items.map((item) => ({
                    order_id: orderData.id,
                    item_name: item.name,
                    description: item.description,
                    unit_price: item.price,
                    status: "New",
                    assigned_tailor_id: item.assigned_tailor_id || null,
                }));
                const { error: detailsError } = await supabase
                    .from("order_details")
                    .insert(details);
                if (detailsError) throw detailsError;
            }

            await insertOrderLog({
                order_id: orderData.id,
                action: "order_created",
                new_value: orderData as unknown as Record<string, unknown>,
                updated_by,
            });

            const total = Number(orderData.total_amount ?? 0);
            const payRaw = initial_payment?.amount;
            if (
                payRaw != null &&
                Number.isFinite(Number(payRaw)) &&
                Number(payRaw) > 0 &&
                initial_payment?.payment_method
            ) {
                const amount = Math.min(Number(payRaw), total);
                if (amount > 0) {
                    const { data: payRow, error: payErr } = await supabase
                        .from("payments")
                        .insert({
                            order_id: orderData.id,
                            amount,
                            payment_method: initial_payment.payment_method,
                        })
                        .select()
                        .single();
                    if (payErr) throw payErr;
                    const { error: rpcErr } = await supabase.rpc(
                        "increment_order_payment",
                        {
                            order_id: orderData.id,
                            amount,
                        },
                    );
                    if (rpcErr) {
                        throw new Error(
                            rpcErr.message ||
                                "Cập nhật paid_amount sau thanh toán ban đầu thất bại",
                        );
                    }
                    await insertOrderLog({
                        order_id: orderData.id,
                        action: "payment",
                        entity_type: "payment",
                        entity_id: payRow.id,
                        new_value: {
                            amount,
                            payment_method: initial_payment.payment_method,
                            initial_on_create: true,
                        } as Record<string, unknown>,
                        updated_by,
                    });
                }
            }

            const customerId =
                orderData.customer_id != null
                    ? Number(orderData.customer_id)
                    : null;
            if (customerId != null) {
                const { error: debtError } = await supabase.rpc(
                    "recalculate_customer_debt",
                    { customer_id: customerId },
                );
                if (debtError) throw debtError;
            }

            const { data: finalOrder, error: finalErr } = await supabase
                .from("orders")
                .select()
                .eq("id", orderData.id)
                .single();
            if (finalErr) throw finalErr;
            return finalOrder as Order;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["orders-infinite"] });
            qc.invalidateQueries({ queryKey: ["customers"] });
            qc.invalidateQueries({ queryKey: ["stats"] });
            qc.invalidateQueries({ queryKey: ["all-order-items"] });
            qc.invalidateQueries({ queryKey: ["order-items"] });
            qc.invalidateQueries({ queryKey: ["payments"] });
        },
    });
}

export function useUpdateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            order,
            updated_by,
        }: {
            id: number;
            order: Partial<Order>;
            updated_by?: string | null;
        }) => {
            if (order.status === "Completed") {
                const { data: row, error: selErr } = await supabase
                    .from("orders")
                    .select("total_amount, paid_amount")
                    .eq("id", id)
                    .single();
                if (selErr) throw selErr;
                const total = Number(
                    order.total_amount ?? row?.total_amount ?? 0,
                );
                const paid = Number(
                    order.paid_amount ?? row?.paid_amount ?? 0,
                );
                if (total - paid > 0.001) {
                    throw new Error(
                        "Chỉ hoàn thành đơn khi đã thu đủ tiền (còn nợ trên đơn).",
                    );
                }
            }
            const { data, error } = await supabase
                .from("orders")
                .update({ ...order, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            await insertOrderLog({
                order_id: id,
                action: "order_updated",
                new_value: order as Record<string, unknown>,
                updated_by,
            });
            return data as Order;
        },
        onMutate: async ({ id, order }) => {
            await qc.cancelQueries({ queryKey: ["orders"] });
            await qc.cancelQueries({ queryKey: ["orders-infinite"] });
            const prev = qc.getQueryData<Order[]>(["orders"]);
            const prevInfinite = qc.getQueriesData<InfiniteData<Order[]>>({
                queryKey: ["orders-infinite"],
                exact: false,
            });
            if (prev) {
                qc.setQueryData<Order[]>(
                    ["orders"],
                    prev.map((o) => (o.id === id ? { ...o, ...order } : o)),
                );
            }
            for (const [queryKey, data] of prevInfinite) {
                if (data !== undefined) {
                    qc.setQueryData(
                        queryKey,
                        patchOrderInInfinitePages(data, id, order),
                    );
                }
            }
            return { prev, prevInfinite };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["orders"], ctx.prev);
            if (ctx?.prevInfinite) {
                for (const [queryKey, data] of ctx.prevInfinite) {
                    qc.setQueryData(queryKey, data);
                }
            }
        },
        onSettled: (_data, _error, variables) => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["orders-infinite"] });
            qc.invalidateQueries({ queryKey: ["stats"] });
            if (variables?.id != null) {
                qc.invalidateQueries({ queryKey: ["orders", variables.id] });
            }
        },
    });
}

export function useUpdateOrderStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orderId,
            status,
        }: {
            orderId: number;
            status: string;
        }) => {
            if (status === "Completed") {
                const { data: row, error: selErr } = await supabase
                    .from("orders")
                    .select("total_amount, paid_amount")
                    .eq("id", orderId)
                    .single();
                if (selErr) throw selErr;
                const total = Number(row?.total_amount ?? 0);
                const paid = Number(row?.paid_amount ?? 0);
                if (total - paid > 0.001) {
                    throw new Error(
                        "Chỉ hoàn thành đơn khi đã thu đủ tiền (còn nợ trên đơn).",
                    );
                }
            }
            const { data, error } = await supabase
                .from("orders")
                .update({ status, updated_at: new Date().toISOString() })
                .eq("id", orderId)
                .select()
                .single();
            if (error) throw error;
            return data as Order;
        },
        onMutate: async ({ orderId, status }) => {
            await qc.cancelQueries({ queryKey: ["orders"] });
            await qc.cancelQueries({ queryKey: ["orders-infinite"] });
            const prev = qc.getQueryData<Order[]>(["orders"]);
            const prevInfinite = qc.getQueriesData<InfiniteData<Order[]>>({
                queryKey: ["orders-infinite"],
                exact: false,
            });
            const nextStatus = status as Order["status"];
            if (prev) {
                qc.setQueryData<Order[]>(
                    ["orders"],
                    prev.map((o) =>
                        o.id === orderId ? { ...o, status: nextStatus } : o,
                    ),
                );
            }
            for (const [queryKey, data] of prevInfinite) {
                if (data !== undefined) {
                    qc.setQueryData(
                        queryKey,
                        setOrderStatusInInfinitePages(
                            data,
                            orderId,
                            nextStatus,
                        ),
                    );
                }
            }
            return { prev, prevInfinite };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["orders"], ctx.prev);
            if (ctx?.prevInfinite) {
                for (const [queryKey, data] of ctx.prevInfinite) {
                    qc.setQueryData(queryKey, data);
                }
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["orders-infinite"] });
            qc.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useUpdateOrderDetail() {
    const qc = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({
            id,
            detail,
            updated_by,
        }: UpdateOrderDetailVariables) => {
            const payload: Record<string, unknown> = {
                ...detail,
                updated_at: new Date().toISOString(),
            };
            if ("assigned_tailor_id" in detail) {
                const v = detail.assigned_tailor_id;
                payload.assigned_tailor_id =
                    v == null || v === "" ? null : String(v);
            }
            if ("status" in detail && detail.status != null) {
                const ns = detail.status;
                if (ns === "Delivered" || ns === "DeliveredOwing") {
                    payload.handed_over_at = new Date().toISOString();
                } else if (
                    ns === "New" ||
                    ns === "In Progress" ||
                    ns === "Ready" ||
                    ns === "Completed"
                ) {
                    payload.handed_over_at = null;
                }
            }
            const { data, error } = await supabase
                .from("order_details")
                .update(payload)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;

            await insertOrderLog({
                order_id: data.order_id,
                action: "detail_updated",
                entity_type: "order_detail",
                entity_id: id,
                new_value: detail as Record<string, unknown>,
                updated_by,
            });

            // If price or other fields that affect total changed, recalc order total from sum of details
            if ("unit_price" in detail || "item_name" in detail) {
                const { data: allDetails } = await supabase
                    .from("order_details")
                    .select("unit_price")
                    .eq("order_id", data.order_id);
                const newTotal = (allDetails || []).reduce(
                    (s, d) => s + Number(d.unit_price || 0),
                    0,
                );
                await supabase
                    .from("orders")
                    .update({
                        total_amount: newTotal,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", data.order_id);
                const { data: orderRow } = await supabase
                    .from("orders")
                    .select("customer_id")
                    .eq("id", data.order_id)
                    .single();
                if (orderRow?.customer_id != null) {
                    await supabase.rpc("recalculate_customer_debt", {
                        customer_id: Number(orderRow.customer_id),
                    });
                }
            }

            // Auto-sync parent order status based on all sibling item statuses
            if (detail.status) {
                const { data: siblings } = await supabase
                    .from("order_details")
                    .select("status")
                    .eq("order_id", data.order_id);
                const { data: curOrdRow } = await supabase
                    .from("orders")
                    .select("status")
                    .eq("id", data.order_id)
                    .single();
                const curOrderSt = (curOrdRow?.status as string) || "New";
                if (siblings && siblings.length > 0) {
                    const lineWorkDone = (st: string) =>
                        st === "Ready" ||
                        st === "Completed" ||
                        st === "Delivered" ||
                        st === "DeliveredOwing";
                    const allReady = siblings.every((s) =>
                        lineWorkDone(s.status),
                    );
                    const anyInProgress = siblings.some(
                        (s) => s.status === "In Progress",
                    );
                    let newOrderStatus: string | null = null;
                    if (
                        allReady &&
                        (curOrderSt === "New" || curOrderSt === "In Progress")
                    ) {
                        newOrderStatus = "Ready";
                    } else if (
                        anyInProgress ||
                        detail.status === "In Progress"
                    ) {
                        newOrderStatus = "In Progress";
                    }
                    if (newOrderStatus) {
                        await supabase
                            .from("orders")
                            .update({
                                status: newOrderStatus,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("id", data.order_id);
                    }
                }
            }

            const { data: parentRow, error: parentErr } = await supabase
                .from("orders")
                .select("total_amount, status, updated_at")
                .eq("id", data.order_id)
                .single();
            if (parentErr) throw parentErr;

            const taskTailor = await fetchTailorForTaskRow(
                data.assigned_tailor_id,
            );

            return {
                detail: data as OrderDetail,
                parent: parentRow as Pick<
                    Order,
                    "total_amount" | "status" | "updated_at"
                >,
                taskTailor,
            };
        },
        onMutate: async ({ id, detail, assignee_tailor }) => {
            await qc.cancelQueries({ queryKey: ["orders"] });
            await qc.cancelQueries({ queryKey: ["orders-infinite"] });
            await qc.cancelQueries({ queryKey: ["all-order-items"] });
            await qc.cancelQueries({ queryKey: ["order-items"] });
            const prev = qc.getQueryData<Order[]>(["orders"]);
            if (prev) {
                qc.setQueryData<Order[]>(
                    ["orders"],
                    prev.map((o) => ({
                        ...o,
                        details: o.details?.map((d) =>
                            d.id === id ? { ...d, ...detail } : d,
                        ),
                    })),
                );
            }

            const prevAllOrderItems = qc.getQueryData<CachedOrderTaskRow[]>([
                "all-order-items",
            ]);
            const prevOrderItemsQueries = qc.getQueriesData<CachedOrderTaskRow[]>(
                { queryKey: ["order-items"] },
            );

            if (prevAllOrderItems !== undefined) {
                qc.setQueryData(
                    ["all-order-items"],
                    applyDetailPatchToTaskRows(
                        prevAllOrderItems,
                        id,
                        detail,
                        assignee_tailor,
                    ),
                );
            }
            for (const [queryKey, rowData] of prevOrderItemsQueries) {
                if (rowData !== undefined) {
                    qc.setQueryData(
                        queryKey,
                        applyDetailPatchToTaskRows(
                            rowData,
                            id,
                            detail,
                            assignee_tailor,
                        ),
                    );
                }
            }

            return { prev, prevAllOrderItems, prevOrderItemsQueries };
        },
        onSuccess: (result) => {
            const { detail, parent, taskTailor } = result;
            const taskPatch = taskRowPatchFromDetail(detail);
            const assigneeHint =
                detail.assigned_tailor_id == null ||
                detail.assigned_tailor_id === ""
                    ? null
                    : taskTailor;

            qc.setQueryData<Order[]>(["orders"], (old) =>
                old
                    ? patchOrdersArrayWithDetail(
                          old,
                          detail,
                          parent,
                          taskTailor,
                      )
                    : old,
            );

            qc.setQueriesData<InfiniteData<Order[]>>(
                { queryKey: ["orders-infinite"], exact: false },
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page) =>
                            patchOrdersArrayWithDetail(
                                page,
                                detail,
                                parent,
                                taskTailor,
                            ),
                        ),
                    };
                },
            );

            qc.setQueryData<CachedOrderTaskRow[]>(["all-order-items"], (old) =>
                old
                    ? applyDetailPatchToTaskRows(
                          old,
                          detail.id,
                          taskPatch,
                          assigneeHint,
                      )
                    : old,
            );

            qc.setQueriesData<CachedOrderTaskRow[]>(
                { queryKey: ["order-items"], exact: false },
                (old) =>
                    old
                        ? applyDetailPatchToTaskRows(
                              old,
                              detail.id,
                              taskPatch,
                              assigneeHint,
                          )
                        : old,
            );

            qc.invalidateQueries({
                predicate: (q) =>
                    Array.isArray(q.queryKey) &&
                    q.queryKey[0] === "orders" &&
                    q.queryKey[1] != null &&
                    String(q.queryKey[1]) === String(detail.order_id),
            });
            qc.invalidateQueries({
                queryKey: ["orders", "customer"],
                exact: false,
            });
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["orders"], ctx.prev);
            if (ctx?.prevAllOrderItems !== undefined) {
                qc.setQueryData(["all-order-items"], ctx.prevAllOrderItems);
            }
            if (ctx?.prevOrderItemsQueries) {
                for (const [queryKey, data] of ctx.prevOrderItemsQueries) {
                    qc.setQueryData(queryKey, data);
                }
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["stats"] });
        },
    });

    const {
        mutate,
        mutateAsync,
        isPending,
        isIdle,
        isError,
        isSuccess,
        isPaused,
        error,
        data,
        reset,
        status,
        submittedAt,
        variables,
        context,
    } = mutation;

    return {
        mutate,
        mutateAsync,
        isPending,
        isIdle,
        isError,
        isSuccess,
        isPaused,
        error,
        data,
        reset,
        status,
        submittedAt,
        variables,
        context,
    };
}

export type NewOrderDetailItem = {
    item_name: string;
    unit_price: number;
    description?: string | null;
    /** UUID string (users.id when id is UUID) */
    assigned_tailor_id?: string | null;
};

export function useAddOrderDetails() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orderId,
            items,
            updated_by,
        }: {
            orderId: number;
            items: NewOrderDetailItem[];
            updated_by?: string | null;
        }) => {
            if (items.length === 0) return [];
            const rows = items.map((item) => ({
                order_id: orderId,
                item_name: item.item_name,
                description: item.description ?? null,
                unit_price: Number(item.unit_price),
                status: "New",
                assigned_tailor_id:
                    item.assigned_tailor_id == null ||
                    item.assigned_tailor_id === ""
                        ? null
                        : String(item.assigned_tailor_id),
            }));
            const { data: inserted, error: insertErr } = await supabase
                .from("order_details")
                .insert(rows)
                .select();
            if (insertErr) throw insertErr;
            const addTotal = rows.reduce((s, r) => s + Number(r.unit_price), 0);
            const { data: order, error: orderErr } = await supabase
                .from("orders")
                .select("total_amount, customer_id")
                .eq("id", orderId)
                .single();
            if (orderErr) throw orderErr;
            const newTotal = (Number(order?.total_amount) || 0) + addTotal;
            const { error: updateErr } = await supabase
                .from("orders")
                .update({
                    total_amount: newTotal,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);
            if (updateErr) throw updateErr;
            const customerId =
                order?.customer_id == null ? null : Number(order.customer_id);
            if (customerId !== null) {
                const { error: debtErr } = await supabase.rpc(
                    "recalculate_customer_debt",
                    { customer_id: customerId },
                );
                if (debtErr) throw debtErr;
            }
            for (const d of inserted || []) {
                await insertOrderLog({
                    order_id: orderId,
                    action: "detail_updated",
                    entity_type: "order_detail",
                    entity_id: d.id,
                    new_value: {
                        item_name: d.item_name,
                        unit_price: d.unit_price,
                    } as Record<string, unknown>,
                    updated_by,
                });
            }
            return inserted as OrderDetail[];
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["orders", variables.orderId] });
            qc.invalidateQueries({ queryKey: ["orders-infinite"] });
            qc.invalidateQueries({ queryKey: ["customers"] });
            qc.invalidateQueries({ queryKey: ["all-order-items"] });
            qc.invalidateQueries({ queryKey: ["order-items"] });
            qc.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useDeleteOrderDetail() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            updated_by,
        }: {
            id: number;
            updated_by?: string | null;
        }) => {
            const { data: detail, error: fetchErr } = await supabase
                .from("order_details")
                .select("order_id, unit_price")
                .eq("id", id)
                .single();
            if (fetchErr || !detail)
                throw fetchErr || new Error("Chi tiết không tồn tại");
            const { error: delErr } = await supabase
                .from("order_details")
                .delete()
                .eq("id", id);
            if (delErr) throw delErr;
            const orderId = detail.order_id;
            const subtract = Number(detail.unit_price) || 0;
            const { data: order, error: orderErr } = await supabase
                .from("orders")
                .select("total_amount, customer_id")
                .eq("id", orderId)
                .single();
            if (orderErr) throw orderErr;
            const newTotal = Math.max(
                0,
                (Number(order?.total_amount) || 0) - subtract,
            );
            const { error: updateErr } = await supabase
                .from("orders")
                .update({
                    total_amount: newTotal,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);
            if (updateErr) throw updateErr;
            const customerId =
                order?.customer_id == null ? null : Number(order.customer_id);
            if (customerId !== null) {
                const { error: debtErr } = await supabase.rpc(
                    "recalculate_customer_debt",
                    { customer_id: customerId },
                );
                if (debtErr) throw debtErr;
            }
            await insertOrderLog({
                order_id: orderId,
                action: "detail_updated",
                entity_type: "order_detail",
                entity_id: id,
                new_value: { deleted: true } as Record<string, unknown>,
                updated_by,
            });
            return { id, orderId };
        },
        onSuccess: (_data) => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["orders-infinite"] });
            qc.invalidateQueries({ queryKey: ["all-order-items"] });
            qc.invalidateQueries({ queryKey: ["order-items"] });
            qc.invalidateQueries({ queryKey: ["customers"] });
            qc.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useDeleteOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (
            arg: number | { id: number; updated_by?: string | null },
        ) => {
            const id = typeof arg === "number" ? arg : arg.id;
            const updated_by = typeof arg === "number" ? null : arg.updated_by;
            await insertOrderLog({
                order_id: id,
                action: "order_deleted",
                updated_by,
            });
            const { error } = await supabase
                .from("orders")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["orders-infinite"] });
            qc.invalidateQueries({ queryKey: ["all-order-items"] });
            qc.invalidateQueries({ queryKey: ["order-items"] });
            qc.invalidateQueries({ queryKey: ["stats"] });
            qc.invalidateQueries({ queryKey: ["customers"] });
        },
    });
}

export async function getCustomerOrders(
    customerId: number | string,
): Promise<Order[]> {
    const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const [detailsRes, paymentsRes, customerRes] = await Promise.all([
        supabase.from("order_details").select("*").in("order_id", orderIds),
        supabase.from("payments").select("*").in("order_id", orderIds),
        supabase
            .from("customers")
            .select("id, name, phone, address")
            .eq("id", customerId)
            .maybeSingle(),
    ]);

    const detailsByOrder: Record<number, any[]> = {};
    if (detailsRes.data)
        for (const d of detailsRes.data) {
            if (!detailsByOrder[d.order_id]) detailsByOrder[d.order_id] = [];
            detailsByOrder[d.order_id].push(d);
        }
    const paymentsByOrder: Record<number, any[]> = {};
    if (paymentsRes.data)
        for (const p of paymentsRes.data) {
            if (!paymentsByOrder[p.order_id]) paymentsByOrder[p.order_id] = [];
            paymentsByOrder[p.order_id].push(p);
        }

    const customer = customerRes.data ?? null;

    return orders.map((o) => ({
        ...o,
        customer,
        details: detailsByOrder[o.id] || [],
        payments: paymentsByOrder[o.id] || [],
    })) as Order[];
}

export async function getOrder(orderId: number | string): Promise<Order> {
    const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
    if (error) throw error;

    const [customerRes, detailsRes, paymentsRes, creatorLogRes] = await Promise.all([
        order.customer_id
            ? supabase
                  .from("customers")
                  .select("*")
                  .eq("id", order.customer_id)
                  .single()
            : Promise.resolve({ data: null }),
        supabase.from("order_details").select("*").eq("order_id", order.id),
        supabase.from("payments").select("*").eq("order_id", order.id),
        supabase
            .from("order_logs")
            .select("updated_by, created_at")
            .eq("order_id", order.id)
            .eq("action", "order_created")
            .order("created_at", { ascending: true })
            .limit(1),
    ]);

    const details = detailsRes.data || [];
    const tailorIds = [
        ...new Set(
            details.map((d: any) => d.assigned_tailor_id).filter(Boolean),
        ),
    ];
    const tailorMap: Record<string, { id: string; name: string }> = {};
    if (tailorIds.length > 0) {
        const { data: tailors } = await supabase
            .from("users")
            .select("id, name")
            .in("id", tailorIds);
        if (tailors)
            for (const t of tailors)
                tailorMap[String(t.id)] = { id: String(t.id), name: t.name };
    }

    const detailsWithTailor = details.map((d: any) => ({
        ...d,
        tailor: d.assigned_tailor_id
            ? tailorMap[String(d.assigned_tailor_id)] || null
            : null,
    }));

    let createdByName: string | null = null;
    const creatorId = creatorLogRes.data?.[0]?.updated_by;
    if (creatorId != null) {
        const { data: creator } = await supabase
            .from("users")
            .select("name")
            .eq("id", creatorId)
            .single();
        createdByName = creator?.name ?? null;
    }

    return {
        ...order,
        created_by_name: createdByName,
        customer: customerRes.data || null,
        details: detailsWithTailor,
        payments: paymentsRes.data || [],
    } as Order;
}
