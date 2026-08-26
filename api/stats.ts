import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type {
    DashboardPeriodAnalytics,
    DashboardPeriodDebtOrderRow,
    DashboardPeriodItemRow,
    DashboardPeriodOrderRow,
    DashboardPeriodSelection,
    MonthlyRevenue,
} from "@/lib/types";
import { ORDER_STATUS_FILTER_SEQUENCE } from "@/lib/orderStatusUi";
import { fetchAllPages, fetchByIdChunks } from "@/lib/supabasePaging";

export interface DashboardStats {
    totalRevenue: number;
    customerCount: number;
    pendingCount: number;
    totalDebt: number;
    orderCount: number;
    completedCount: number;
}

/**
 * Cộng một cột số qua toàn bộ bảng bằng cách phân trang.
 * Chỉ dùng làm phương án dự phòng khi hàm SQL tổng hợp chưa được áp lên Supabase.
 */
async function sumColumnPaginated(
    table: "payments" | "customers",
    column: "amount" | "total_debt",
): Promise<number> {
    const rows = await fetchAllPages<Record<string, unknown>>((from, to) =>
        supabase
            .from(table)
            .select(column)
            .order("id", { ascending: true })
            .range(from, to),
    );
    return rows.reduce((sum, row) => sum + Number(row[column] ?? 0), 0);
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ["stats"],
        queryFn: async (): Promise<DashboardStats> => {
            // Tổng tiền phải tính bằng SQL: cộng ở client sẽ chỉ cộng được 1000
            // dòng đầu (trần của PostgREST) và ra con số sai rất xa.
            const { data: agg, error: aggErr } = await supabase.rpc(
                "get_dashboard_stats",
            );
            const aggRow = Array.isArray(agg) ? agg[0] : agg;
            if (!aggErr && aggRow) {
                return {
                    totalRevenue: Number(aggRow.total_revenue ?? 0),
                    customerCount: Number(aggRow.customer_count ?? 0),
                    pendingCount: Number(aggRow.pending_count ?? 0),
                    totalDebt: Number(aggRow.total_debt ?? 0),
                    orderCount: Number(aggRow.order_count ?? 0),
                    completedCount: Number(aggRow.completed_count ?? 0),
                };
            }

            // Dự phòng cho khoảng thời gian code đã deploy nhưng
            // supabase_migration_dashboard_aggregates.sql chưa được chạy.
            // Chậm hơn nhiều nhưng vẫn ra đúng số.
            const [
                totalRevenue,
                totalDebt,
                custRes,
                pendRes,
                orderRes,
                completedRes,
            ] = await Promise.all([
                sumColumnPaginated("payments", "amount"),
                sumColumnPaginated("customers", "total_debt"),
                supabase
                    .from("customers")
                    .select("*", { count: "exact", head: true }),
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true })
                    .in("status", ["New", "In Progress"]),
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true }),
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true })
                    .in("status", ["Ready", "Completed"]),
            ]);

            if (custRes.error) throw custRes.error;
            if (pendRes.error) throw pendRes.error;

            return {
                totalRevenue,
                customerCount: custRes.count || 0,
                pendingCount: pendRes.count || 0,
                totalDebt,
                orderCount: orderRes.count || 0,
                completedCount: completedRes.count || 0,
            };
        },
    });
}

// Parse PostgreSQL timestamptz (e.g. "2026-03-04 17:09:58.485255+00") reliably
function parsePaymentTime(raw: string | null | undefined): Date | null {
    if (raw == null || raw === "") return null;
    const s = String(raw)
        .trim()
        .replace(" ", "T")
        .replace(/\+00$/, "+00:00")
        .replace(/-00$/, "-00:00");
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function monthKeyLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useMonthlyRevenue() {
    return useQuery({
        queryKey: ["stats", "monthly"],
        queryFn: async (): Promise<MonthlyRevenue[]> => {
            const monthMap = new Map<string, number>();

            // Gộp theo tháng bằng SQL. Trước đây lấy thẳng bảng payments nên chỉ
            // thấy 1000 lượt thanh toán mới nhất — biểu đồ mất sạch tháng cũ.
            const { data: agg, error: aggErr } = await supabase.rpc(
                "get_monthly_revenue",
            );
            if (!aggErr && Array.isArray(agg)) {
                for (const row of agg) {
                    monthMap.set(
                        String(row.month_key),
                        Number(row.revenue ?? 0),
                    );
                }
            } else {
                // Dự phòng khi hàm SQL chưa được áp lên Supabase.
                const payments = await fetchAllPages<{
                    amount: number;
                    payment_time: string;
                }>((from, to) =>
                    supabase
                        .from("payments")
                        .select("amount, payment_time")
                        .order("id", { ascending: true })
                        .range(from, to),
                );
                for (const p of payments) {
                    const d = parsePaymentTime(p.payment_time);
                    if (d == null) continue;
                    const key = monthKeyLocal(d);
                    monthMap.set(
                        key,
                        (monthMap.get(key) || 0) + Number(p.amount),
                    );
                }
            }

            const monthNames = [
                "T1",
                "T2",
                "T3",
                "T4",
                "T5",
                "T6",
                "T7",
                "T8",
                "T9",
                "T10",
                "T11",
                "T12",
            ];

            const now = new Date();
            const last12Keys = new Set<string>();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                last12Keys.add(monthKeyLocal(d));
            }

            const allKeys = new Set<string>([
                ...last12Keys,
                ...monthMap.keys(),
            ]);
            const sorted = [...allKeys].sort((a, b) => a.localeCompare(b));

            return sorted.map((key) => {
                const [y, m] = key.split("-");
                const monthIndex = Number.parseInt(m, 10) - 1;
                const label = last12Keys.has(key)
                    ? monthNames[monthIndex]
                    : `${monthNames[monthIndex]}/${y}`;
                return { month: label, revenue: monthMap.get(key) ?? 0 };
            });
        },
    });
}

function getPeriodIsoBounds(sel: DashboardPeriodSelection): {
    startIso: string;
    endIso: string;
} {
    if (sel.mode === "year") {
        const y = Number.parseInt(sel.value, 10);
        const year = Number.isFinite(y) ? y : new Date().getFullYear();
        const start = new Date(year, 0, 1, 0, 0, 0, 0);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        return { startIso: start.toISOString(), endIso: end.toISOString() };
    }
    if (sel.mode === "month") {
        const parts = sel.value.split("-");
        const y = Number.parseInt(parts[0], 10);
        const mo = Number.parseInt(parts[1], 10) - 1;
        const year = Number.isFinite(y) ? y : new Date().getFullYear();
        const month = Number.isFinite(mo) && mo >= 0 && mo <= 11 ? mo : new Date().getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        const end = new Date(year, month, lastDay, 23, 59, 59, 999);
        return { startIso: start.toISOString(), endIso: end.toISOString() };
    }
    const parts = sel.value.split("-");
    const y = Number.parseInt(parts[0], 10);
    const mo = Number.parseInt(parts[1], 10) - 1;
    const d = Number.parseInt(parts[2], 10);
    const now = new Date();
    const year = Number.isFinite(y) ? y : now.getFullYear();
    const month = Number.isFinite(mo) && mo >= 0 && mo <= 11 ? mo : now.getMonth();
    const day = Number.isFinite(d) && d >= 1 && d <= 31 ? d : now.getDate();
    const start = new Date(year, month, day, 0, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
}

type RevenueOrderAgg = {
    amount: number;
    latestPaymentMethod: "Cash" | "Card" | "Transfer" | null;
    latestPaymentTime: string | null;
    payments: {
        amount: number;
        payment_time: string;
        payment_method: "Cash" | "Card" | "Transfer" | null;
    }[];
};

async function sumRevenuePaymentsInRange(
    startIso: string,
    endIso: string,
): Promise<{ total: number; byOrder: Map<number, RevenueOrderAgg> }> {
    let total = 0;
    const byOrder = new Map<number, RevenueOrderAgg>();
    const page = 1000;
    for (let from = 0; ; from += page) {
        const { data, error } = await supabase
            .from("payments")
            .select("order_id, amount, payment_method, payment_time")
            .gte("payment_time", startIso)
            .lte("payment_time", endIso)
            .order("id", { ascending: true })
            .range(from, from + page - 1);
        if (error) throw error;
        if (!data?.length) break;
        for (const p of data) {
            const amount = Number(p.amount ?? 0);
            if (!Number.isFinite(amount) || amount <= 0) continue;
            total += amount;

            const orderId = Number(p.order_id);
            if (!Number.isFinite(orderId) || orderId <= 0) continue;

            const prev = byOrder.get(orderId) ?? {
                amount: 0,
                latestPaymentMethod: null,
                latestPaymentTime: null,
                payments: [],
            };
            const prevTs = parsePaymentTime(prev.latestPaymentTime)?.getTime() ?? -1;
            const currentTs = parsePaymentTime(p.payment_time)?.getTime() ?? -1;
            byOrder.set(orderId, {
                amount: prev.amount + amount,
                latestPaymentMethod:
                    currentTs >= prevTs
                        ? (p.payment_method as
                              | "Cash"
                              | "Card"
                              | "Transfer"
                              | null)
                        : prev.latestPaymentMethod,
                latestPaymentTime:
                    currentTs >= prevTs ? p.payment_time : prev.latestPaymentTime,
                payments: [
                    ...prev.payments,
                    {
                        amount,
                        payment_time: p.payment_time,
                        payment_method: p.payment_method as
                            | "Cash"
                            | "Card"
                            | "Transfer"
                            | null,
                    },
                ],
            });
        }
        if (data.length < page) break;
    }
    return { total, byOrder };
}

async function sumUnpaidOnOrdersCreatedInRange(
    startIso: string,
    endIso: string,
): Promise<number> {
    let sum = 0;
    const page = 1000;
    for (let from = 0; ; from += page) {
        const { data, error } = await supabase
            .from("orders")
            .select("total_amount, paid_amount")
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("id", { ascending: true })
            .range(from, from + page - 1);
        if (error) throw error;
        if (!data?.length) break;
        for (const o of data) {
            const unpaid =
                Number(o.total_amount) - Number(o.paid_amount ?? 0);
            if (unpaid > 0) sum += unpaid;
        }
        if (data.length < page) break;
    }
    return sum;
}

async function fetchAllReturnedOrderIdsInRange(
    startIso: string,
    endIso: string,
): Promise<number[]> {
    const ids: number[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
        const { data, error } = await supabase
            .from("orders")
            .select("id")
            .in("status", ["Delivered", "DeliveredOwing"])
            .not("return_time", "is", null)
            .gte("return_time", startIso)
            .lte("return_time", endIso)
            .order("id", { ascending: true })
            .range(from, from + page - 1);
        if (error) throw error;
        if (!data?.length) break;
        ids.push(...data.map((o) => o.id));
        if (data.length < page) break;
    }
    return ids;
}

async function fetchCustomerNames(
    ids: (number | null | undefined)[],
): Promise<Record<number, string>> {
    const unique = [...new Set(ids.filter((x): x is number => typeof x === "number" && x > 0))];
    if (unique.length === 0) return {};
    const map: Record<number, string> = {};
    for (let i = 0; i < unique.length; i += 150) {
        const chunk = unique.slice(i, i + 150);
        const { data, error } = await supabase
            .from("customers")
            .select("id, name")
            .in("id", chunk);
        if (error) throw error;
        for (const c of data || []) map[c.id] = c.name;
    }
    return map;
}

async function fetchOrdersByIds(
    ids: number[],
): Promise<
    {
        id: number;
        customer_id: number | null;
        total_amount: number;
        paid_amount: number;
        status: string;
        return_time: string | null;
        created_at: string;
    }[]
> {
    if (ids.length === 0) return [];
    const rows: {
        id: number;
        customer_id: number | null;
        total_amount: number;
        paid_amount: number;
        status: string;
        return_time: string | null;
        created_at: string;
    }[] = [];
    for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { data, error } = await supabase
            .from("orders")
            .select(
                "id, customer_id, total_amount, paid_amount, status, return_time, created_at",
            )
            .in("id", chunk);
        if (error) throw error;
        rows.push(
            ...((data || []) as {
                id: number;
                customer_id: number | null;
                total_amount: number;
                paid_amount: number;
                status: string;
                return_time: string | null;
                created_at: string;
            }[]),
        );
    }
    return rows;
}

async function fetchPeriodAnalytics(
    sel: DashboardPeriodSelection,
): Promise<DashboardPeriodAnalytics> {
    const { startIso, endIso } = getPeriodIsoBounds(sel);

    const [
        createdCountRes,
        returnedCountRes,
        itemsCreatedCountRes,
        revenueSummary,
        periodUnpaidOnOrdersCreated,
        ...createdStatusCountRes
    ] = await Promise.all([
            supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .gte("created_at", startIso)
                .lte("created_at", endIso),
            supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .in("status", ["Delivered", "DeliveredOwing"])
                .not("return_time", "is", null)
                .gte("return_time", startIso)
                .lte("return_time", endIso),
            supabase
                .from("order_details")
                .select("*", { count: "exact", head: true })
                .gte("created_at", startIso)
                .lte("created_at", endIso),
            sumRevenuePaymentsInRange(startIso, endIso),
            sumUnpaidOnOrdersCreatedInRange(startIso, endIso),
            ...ORDER_STATUS_FILTER_SEQUENCE.map((st) =>
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true })
                    .eq("status", st)
                    .gte("created_at", startIso)
                    .lte("created_at", endIso),
            ),
        ]);

    if (createdCountRes.error) throw createdCountRes.error;
    if (returnedCountRes.error) throw returnedCountRes.error;
    if (itemsCreatedCountRes.error) throw itemsCreatedCountRes.error;

    const ordersCreatedStatusCounts: Record<string, number> = {};
    ORDER_STATUS_FILTER_SEQUENCE.forEach((st, i) => {
        const r = createdStatusCountRes[i];
        if (r.error) throw r.error;
        ordersCreatedStatusCounts[st] = r.count ?? 0;
    });

    const allReturnedOrderIds = await fetchAllReturnedOrderIdsInRange(
        startIso,
        endIso,
    );
    let itemsReturnedCount = 0;
    for (let i = 0; i < allReturnedOrderIds.length; i += 200) {
        const chunk = allReturnedOrderIds.slice(i, i + 200);
        const { count, error } = await supabase
            .from("order_details")
            .select("*", { count: "exact", head: true })
            .in("order_id", chunk);
        if (error) throw error;
        itemsReturnedCount += count || 0;
    }

    const revenueOrderIds = [...revenueSummary.byOrder.keys()];
    const revenueOrderIdsSorted = revenueOrderIds
        .sort((a, b) => {
            const ta =
                parsePaymentTime(revenueSummary.byOrder.get(a)?.latestPaymentTime)
                    ?.getTime() ?? 0;
            const tb =
                parsePaymentTime(revenueSummary.byOrder.get(b)?.latestPaymentTime)
                    ?.getTime() ?? 0;
            return tb - ta;
        });

    const [ordersCreatedDataRes, ordersReturnedDataRes, detailsCreatedRes] =
        await Promise.all([
            supabase
                .from("orders")
                .select(
                    "id, customer_id, total_amount, paid_amount, status, return_time, created_at",
                )
                .gte("created_at", startIso)
                .lte("created_at", endIso)
                .order("created_at", { ascending: false })
                .limit(300),
            supabase
                .from("orders")
                .select(
                    "id, customer_id, total_amount, paid_amount, status, return_time, created_at",
                )
                .in("status", ["Delivered", "DeliveredOwing"])
                .not("return_time", "is", null)
                .gte("return_time", startIso)
                .lte("return_time", endIso)
                .order("return_time", { ascending: false })
                .limit(150),
            supabase
                .from("order_details")
                .select("id, order_id, item_name, status, created_at")
                .gte("created_at", startIso)
                .lte("created_at", endIso)
                .order("created_at", { ascending: false })
                .limit(200),
        ]);

    if (ordersCreatedDataRes.error) throw ordersCreatedDataRes.error;
    if (ordersReturnedDataRes.error) throw ordersReturnedDataRes.error;
    if (detailsCreatedRes.error) throw detailsCreatedRes.error;

    const ordersCreatedRaw = ordersCreatedDataRes.data || [];
    const ordersReturnedRaw = ordersReturnedDataRes.data || [];
    const detailsCreatedRaw = detailsCreatedRes.data || [];
    const ordersRevenueRaw = await fetchOrdersByIds(revenueOrderIdsSorted);
    const allOrderIdsForPayment = [
        ...new Set([
            ...ordersCreatedRaw.map((o) => o.id),
            ...ordersReturnedRaw.map((o) => o.id),
        ]),
    ];
    // Chia lô bắt buộc: chọn kỳ "Năm" cho ra vài nghìn order id, nhét hết vào một
    // filter in.(...) làm URL dài ~35KB và Supabase trả HTTP 400.
    const paymentsForOrders = await fetchByIdChunks<
        { order_id: number; payment_method: string; payment_time: string },
        number
    >(allOrderIdsForPayment, (ids, from, to) =>
        supabase
            .from("payments")
            .select("order_id, payment_method, payment_time")
            .in("order_id", ids)
            .order("id", { ascending: true })
            .range(from, to),
    );
    const latestPaymentByOrder = new Map<
        number,
        { method: "Cash" | "Card" | "Transfer"; time: number }
    >();
    for (const p of paymentsForOrders) {
        const ts = new Date(p.payment_time).getTime();
        const prev = latestPaymentByOrder.get(p.order_id);
        if (!prev || ts > prev.time) {
            latestPaymentByOrder.set(p.order_id, {
                method: p.payment_method as "Cash" | "Card" | "Transfer",
                time: ts,
            });
        }
    }

    const custIds = [
        ...ordersCreatedRaw.map((o) => o.customer_id),
        ...ordersReturnedRaw.map((o) => o.customer_id),
        ...ordersRevenueRaw.map((o) => o.customer_id),
    ];
    const detailOrderIdsForCreated = [...new Set(detailsCreatedRaw.map((d) => d.order_id))];
    const ordersForDetailRows = await fetchByIdChunks<
        { id: number; customer_id: number },
        number
    >(detailOrderIdsForCreated, (ids, from, to) =>
        supabase
            .from("orders")
            .select("id, customer_id")
            .in("id", ids)
            .order("id", { ascending: true })
            .range(from, to),
    );
    for (const o of ordersForDetailRows)
        custIds.push(o.customer_id);

    const customerMap = await fetchCustomerNames(custIds);

    const ordersCreated: DashboardPeriodOrderRow[] = ordersCreatedRaw.map(
        (o) => {
            const total = Number(o.total_amount);
            const paid = Number(o.paid_amount ?? 0);
            return {
                id: o.id,
                created_at: o.created_at,
                return_time: o.return_time,
                status: o.status,
                customer_name:
                    customerMap[o.customer_id as number] || "Vãng lai",
                total_amount: total,
                paid_amount: paid,
                unpaid_amount: Math.max(0, total - paid),
                payment_method:
                    latestPaymentByOrder.get(o.id)?.method ?? null,
            };
        },
    );

    const ordersDebt: DashboardPeriodDebtOrderRow[] = ordersCreatedRaw
        .map((o) => {
            const total = Number(o.total_amount);
            const paid = Number(o.paid_amount ?? 0);
            const unpaid = Math.max(0, total - paid);
            return {
                id: o.id,
                created_at: o.created_at,
                return_time: o.return_time,
                status: o.status,
                customer_name:
                    customerMap[o.customer_id as number] || "Vãng lai",
                total_amount: total,
                paid_amount: paid,
                unpaid_amount: unpaid,
                payment_method:
                    latestPaymentByOrder.get(o.id)?.method ?? null,
            };
        })
        .filter((o) => o.unpaid_amount > 0)
        .sort((a, b) => b.unpaid_amount - a.unpaid_amount);

    const ordersRevenue: DashboardPeriodOrderRow[] = ordersRevenueRaw
        .map((o) => {
            const total = Number(o.total_amount);
            const paidOverall = Number(o.paid_amount ?? 0);
            const rev = revenueSummary.byOrder.get(o.id);
            return {
                id: o.id,
                // Reuse created_at field to show latest collected time in revenue tab.
                created_at: rev?.latestPaymentTime || o.created_at,
                order_created_at: o.created_at,
                return_time: o.return_time,
                status: o.status,
                customer_name:
                    customerMap[o.customer_id as number] || "Vãng lai",
                total_amount: total,
                paid_amount: rev?.amount ?? 0,
                unpaid_amount: Math.max(0, total - paidOverall),
                payment_method: rev?.latestPaymentMethod ?? null,
                revenue_payments: (rev?.payments || [])
                    .slice()
                    .sort(
                        (a, b) =>
                            new Date(b.payment_time).getTime() -
                            new Date(a.payment_time).getTime(),
                    ),
            };
        })
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
        );

    const ordersReturned: DashboardPeriodOrderRow[] = ordersReturnedRaw.map(
        (o) => {
            const total = Number(o.total_amount);
            const paid = Number(o.paid_amount ?? 0);
            return {
                id: o.id,
                created_at: o.created_at,
                return_time: o.return_time,
                status: o.status,
                customer_name:
                    customerMap[o.customer_id as number] || "Vãng lai",
                total_amount: total,
                paid_amount: paid,
                unpaid_amount: Math.max(0, total - paid),
                payment_method:
                    latestPaymentByOrder.get(o.id)?.method ?? null,
            };
        },
    );

    const orderIdToCustomerId: Record<number, number | null> = {};
    for (const o of ordersForDetailRows || [])
        orderIdToCustomerId[o.id] = o.customer_id;

    const itemsCreated: DashboardPeriodItemRow[] = detailsCreatedRaw.map(
        (d) => {
            const cid = orderIdToCustomerId[d.order_id];
            return {
                id: d.id,
                order_id: d.order_id,
                item_name: d.item_name,
                status: d.status,
                created_at: d.created_at,
                customer_name:
                    (cid != null && customerMap[cid]) || "Vãng lai",
            };
        },
    );

    const listRetIds = ordersReturnedRaw.map((o) => o.id);
    let itemsReturned: DashboardPeriodItemRow[] = [];
    if (listRetIds.length > 0) {
        // Chia lô để URL không phình theo số đơn trong kỳ; vẫn giữ trần 400 dòng
        // hiển thị như cũ, nhưng lấy đúng 400 dòng mới nhất trên toàn bộ các lô.
        const rdAll = await fetchByIdChunks<
            {
                id: number;
                order_id: number;
                item_name: string;
                status: string;
                created_at: string;
            },
            number
        >(listRetIds, (ids, from, to) =>
            supabase
                .from("order_details")
                .select("id, order_id, item_name, status, created_at")
                .in("order_id", ids)
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .range(from, to),
        );
        const rd = rdAll
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 400);
        const retMeta = new Map<
            number,
            { return_time: string; customer_id: number | null }
        >();
        for (const o of ordersReturnedRaw) {
            retMeta.set(o.id, {
                return_time: o.return_time as string,
                customer_id: o.customer_id,
            });
        }
        itemsReturned = (rd || []).map((d) => {
            const meta = retMeta.get(d.order_id);
            const cid = meta?.customer_id;
            return {
                id: d.id,
                order_id: d.order_id,
                item_name: d.item_name,
                status: d.status,
                created_at: d.created_at,
                customer_name:
                    cid != null && customerMap[cid] ? customerMap[cid] : "Vãng lai",
                return_time: meta?.return_time ?? null,
            };
        });
        itemsReturned.sort((a, b) => {
            const ta = new Date(a.return_time || 0).getTime();
            const tb = new Date(b.return_time || 0).getTime();
            return tb - ta;
        });
    }

    return {
        ordersCreatedCount: createdCountRes.count ?? 0,
        ordersReturnedCount: returnedCountRes.count ?? 0,
        itemsCreatedCount: itemsCreatedCountRes.count ?? 0,
        itemsReturnedCount,
        periodRevenue: revenueSummary.total,
        periodUnpaidOnOrdersCreated,
        ordersCreatedStatusCounts,
        ordersCreated,
        ordersRevenue,
        ordersDebt,
        ordersReturned,
        itemsCreated,
        itemsReturned,
    };
}

export function useDashboardPeriodAnalytics(period: DashboardPeriodSelection) {
    return useQuery({
        queryKey: ["stats", "period", period.mode, period.value],
        queryFn: () => fetchPeriodAnalytics(period),
    });
}
