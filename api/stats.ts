import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { MonthlyRevenue } from "@/lib/types";

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
