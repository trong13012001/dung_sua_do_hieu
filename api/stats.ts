import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type {
    DashboardPeriodAnalytics,
    DashboardPeriodItemRow,
    DashboardPeriodOrderRow,
    DashboardPeriodSelection,
    MonthlyRevenue,
} from "@/lib/types";

export interface DashboardStats {
    totalRevenue: number;
    customerCount: number;
    pendingCount: number;
    totalDebt: number;
    orderCount: number;
    completedCount: number;
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ["stats"],
        queryFn: async (): Promise<DashboardStats> => {
            const [
                revenueRes,
                custRes,
                pendRes,
                debtRes,
                orderRes,
                completedRes,
            ] = await Promise.all([
                supabase.from("payments").select("amount"),
                supabase
                    .from("customers")
                    .select("*", { count: "exact", head: true }),
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true })
                    .in("status", ["New", "In Progress"]),
                supabase.from("customers").select("total_debt"),
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true }),
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true })
                    .in("status", ["Ready", "Completed"]),
            ]);

            if (revenueRes.error) throw revenueRes.error;
            if (custRes.error) throw custRes.error;
            if (pendRes.error) throw pendRes.error;
            if (debtRes.error) throw debtRes.error;

            const totalRevenue = (revenueRes.data || []).reduce(
                (s, p) => s + Number(p.amount),
                0,
            );
            const totalDebt = (debtRes.data || []).reduce(
                (s, c) => s + Number(c.total_debt),
                0,
            );

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

export function useMonthlyRevenue() {
    return useQuery({
        queryKey: ["stats", "monthly"],
        queryFn: async (): Promise<MonthlyRevenue[]> => {
            const { data, error } = await supabase
                .from("payments")
                .select("amount, payment_time")
                .order("payment_time", { ascending: false });

            if (error) throw error;

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
            const monthMap = new Map<string, number>();

            for (const p of data || []) {
                const d = parsePaymentTime(p.payment_time);
                if (d == null) continue;
                const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                monthMap.set(key, (monthMap.get(key) || 0) + Number(p.amount));
            }

            const now = new Date();
            const last12Keys = new Set<string>();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(
                    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
                );
                const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                last12Keys.add(key);
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

async function sumPaymentsAmountInRange(
    startIso: string,
    endIso: string,
): Promise<number> {
    let sum = 0;
    const page = 1000;
    for (let from = 0; ; from += page) {
        const { data, error } = await supabase
            .from("payments")
            .select("amount")
            .gte("payment_time", startIso)
            .lte("payment_time", endIso)
            .order("id", { ascending: true })
            .range(from, from + page - 1);
        if (error) throw error;
        if (!data?.length) break;
        for (const p of data) sum += Number(p.amount);
        if (data.length < page) break;
    }
    return sum;
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
            .eq("status", "Delivered")
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

async function fetchPeriodAnalytics(
    sel: DashboardPeriodSelection,
): Promise<DashboardPeriodAnalytics> {
    const { startIso, endIso } = getPeriodIsoBounds(sel);

    const [
        createdCountRes,
        returnedCountRes,
        itemsCreatedCountRes,
        periodRevenue,
        periodUnpaidOnOrdersCreated,
    ] = await Promise.all([
            supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .gte("created_at", startIso)
                .lte("created_at", endIso),
            supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("status", "Delivered")
                .not("return_time", "is", null)
                .gte("return_time", startIso)
                .lte("return_time", endIso),
            supabase
                .from("order_details")
                .select("*", { count: "exact", head: true })
                .gte("created_at", startIso)
                .lte("created_at", endIso),
            sumPaymentsAmountInRange(startIso, endIso),
            sumUnpaidOnOrdersCreatedInRange(startIso, endIso),
        ]);

    if (createdCountRes.error) throw createdCountRes.error;
    if (returnedCountRes.error) throw returnedCountRes.error;
    if (itemsCreatedCountRes.error) throw itemsCreatedCountRes.error;

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

    const [ordersCreatedDataRes, ordersReturnedDataRes, detailsCreatedRes] =
        await Promise.all([
            supabase
                .from("orders")
                .select(
                    "id, customer_id, total_amount, status, return_time, created_at",
                )
                .gte("created_at", startIso)
                .lte("created_at", endIso)
                .order("created_at", { ascending: false })
                .limit(150),
            supabase
                .from("orders")
                .select(
                    "id, customer_id, total_amount, status, return_time, created_at",
                )
                .eq("status", "Delivered")
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

    const custIds = [
        ...ordersCreatedRaw.map((o) => o.customer_id),
        ...ordersReturnedRaw.map((o) => o.customer_id),
    ];
    const detailOrderIdsForCreated = [...new Set(detailsCreatedRaw.map((d) => d.order_id))];
    const { data: ordersForDetailRows, error: ordersForDetErr } =
        detailOrderIdsForCreated.length > 0
            ? await supabase
                  .from("orders")
                  .select("id, customer_id")
                  .in("id", detailOrderIdsForCreated)
            : { data: [], error: null };
    if (ordersForDetErr) throw ordersForDetErr;
    for (const o of ordersForDetailRows || [])
        custIds.push(o.customer_id);

    const customerMap = await fetchCustomerNames(custIds);

    const ordersCreated: DashboardPeriodOrderRow[] = ordersCreatedRaw.map(
        (o) => ({
            id: o.id,
            created_at: o.created_at,
            return_time: o.return_time,
            status: o.status,
            customer_name:
                customerMap[o.customer_id as number] || "Vãng lai",
            total_amount: Number(o.total_amount),
        }),
    );

    const ordersReturned: DashboardPeriodOrderRow[] = ordersReturnedRaw.map(
        (o) => ({
            id: o.id,
            created_at: o.created_at,
            return_time: o.return_time,
            status: o.status,
            customer_name:
                customerMap[o.customer_id as number] || "Vãng lai",
            total_amount: Number(o.total_amount),
        }),
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
        const { data: rd, error: rdErr } = await supabase
            .from("order_details")
            .select("id, order_id, item_name, status, created_at")
            .in("order_id", listRetIds)
            .order("created_at", { ascending: false })
            .limit(400);
        if (rdErr) throw rdErr;
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
        periodRevenue,
        periodUnpaidOnOrdersCreated,
        ordersCreated,
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
