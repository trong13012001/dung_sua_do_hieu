"use client";

import React, { useMemo, useState } from "react";
import {
    TrendingUp,
    Users,
    AlertCircle,
    Briefcase,
    ShoppingBag,
    CheckCircle2,
    CalendarDays,
    Package,
    PackageCheck,
    Shirt,
    Loader2,
} from "lucide-react";
import { useOrders } from "@/api/orders";
import {
    useDashboardStats,
    useDashboardPeriodAnalytics,
    useMonthlyRevenue,
} from "@/api/stats";
import type { DashboardPeriodMode, Order } from "@/lib/types";
import {
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
} from "recharts";
import Link from "next/link";

const statusLabel = (s: string) => {
    switch (s) {
        case "New":
            return "Mới";
        case "In Progress":
            return "Đang xử lý";
        case "Ready":
            return "Đã xong";
        case "Delivered":
            return "Đã giao";
        case "Completed":
            return "Hoàn thành";
        default:
            return s;
    }
};

const statusColor = (s: string) => {
    switch (s) {
        case "New":
            return "bg-info/10 text-info";
        case "In Progress":
            return "bg-warning/10 text-warning";
        case "Ready":
            return "bg-success/10 text-success";
        case "Delivered":
            return "bg-primary/10 text-primary";
        case "Completed":
            return "bg-success/10 text-success";
        default:
            return "bg-secondary/10 text-secondary";
    }
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function todayYMD() {
    const n = new Date();
    return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
}

function currentYM() {
    const n = new Date();
    return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}`;
}

function periodLabelVi(mode: DashboardPeriodMode, value: string) {
    if (mode === "day") {
        const [y, m, d] = value.split("-").map((x) => Number.parseInt(x, 10));
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
            return value;
        return `${pad2(d)}/${pad2(m)}/${y}`;
    }
    if (mode === "month") {
        const [y, m] = value.split("-").map((x) => Number.parseInt(x, 10));
        if (!Number.isFinite(y) || !Number.isFinite(m)) return value;
        return `Tháng ${m}/${y}`;
    }
    return `Năm ${value}`;
}

type PeriodListTab =
    | "ordersCreated"
    | "ordersReturned"
    | "itemsCreated"
    | "itemsReturned";

export default function DashboardPage() {
    const [periodMode, setPeriodMode] = useState<DashboardPeriodMode>("day");
    const [dayValue, setDayValue] = useState(todayYMD);
    const [monthValue, setMonthValue] = useState(currentYM);
    const [yearValue, setYearValue] = useState(() =>
        String(new Date().getFullYear()),
    );
    const [listTab, setListTab] = useState<PeriodListTab>("itemsCreated");

    const periodSelection = useMemo(
        () => ({
            mode: periodMode,
            value:
                periodMode === "day"
                    ? dayValue
                    : periodMode === "month"
                      ? monthValue
                      : yearValue,
        }),
        [periodMode, dayValue, monthValue, yearValue],
    );

    const {
        data: periodData,
        isLoading: periodLoading,
        isError: periodError,
    } = useDashboardPeriodAnalytics(periodSelection);

    const { data: orders, isLoading: ordersLoading } = useOrders();
    const { data: stats } = useDashboardStats();
    const { data: monthlyData } = useMonthlyRevenue();

    const chartData =
        monthlyData?.map((m) => ({ name: m.month, income: m.revenue })) || [];

    const dashboardStats = [
        {
            name: "Doanh thu",
            value: stats
                ? new Intl.NumberFormat("vi-VN").format(stats.totalRevenue) +
                  "đ"
                : "---",
            subValue: "Tổng cộng",
            icon: TrendingUp,
            color: "primary",
        },
        {
            name: "Khách hàng",
            value: stats?.customerCount?.toString() || "0",
            subValue: "Tổng khách hàng",
            icon: Users,
            color: "success",
        },
        {
            name: "Đang xử lý",
            value: stats?.pendingCount?.toString() || "0",
            subValue: "Đơn chờ làm",
            icon: Briefcase,
            color: "warning",
        },
        {
            name: "Tổng nợ",
            value: stats
                ? new Intl.NumberFormat("vi-VN").format(stats.totalDebt) + "đ"
                : "---",
            subValue: "Chưa thu hồi",
            icon: AlertCircle,
            color: "danger",
        },
    ];

    const extraStats = [
        {
            name: "Tổng đơn hàng",
            value: stats?.orderCount?.toString() || "0",
            icon: ShoppingBag,
            color: "info",
        },
        {
            name: "Đã hoàn thành",
            value: stats?.completedCount?.toString() || "0",
            icon: CheckCircle2,
            color: "success",
        },
    ];

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Main stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {dashboardStats.map((stat) => (
                    <div key={stat.name} className="vuexy-card p-3 md:p-5">
                        <div className="flex justify-between items-center">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base md:text-xl font-bold text-foreground truncate">
                                    {stat.value}
                                </h3>
                                <p className="text-xs md:text-sm text-muted-foreground">
                                    {stat.name}
                                </p>
                            </div>
                            <div
                                className={`p-2 md:p-2.5 rounded-lg bg-${stat.color}/10 text-${stat.color} shrink-0 ml-2`}
                            >
                                <stat.icon
                                    size={18}
                                    className="md:w-[22px] md:h-[22px]"
                                />
                            </div>
                        </div>
                        <div className="mt-2 md:mt-4 text-[11px] md:text-[13px] text-muted-foreground">
                            {stat.subValue}
                        </div>
                    </div>
                ))}
            </div>

            {/* Extra stats row */}
            <div className="grid grid-cols-2 gap-3 md:gap-6">
                {extraStats.map((stat) => (
                    <div
                        key={stat.name}
                        className="vuexy-card p-3 md:p-5 flex items-center gap-3"
                    >
                        <div
                            className={`p-2.5 rounded-lg bg-${stat.color}/10 text-${stat.color}`}
                        >
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-bold text-foreground">
                                {stat.value}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {stat.name}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Phân tích theo ngày / tháng / năm */}
            <div className="vuexy-card p-4 md:p-6 space-y-4 md:space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <h4 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                            <CalendarDays
                                size={20}
                                className="text-primary shrink-0"
                            />
                            Phân tích theo kỳ
                        </h4>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            Đơn tạo theo{" "}
                            <span className="text-foreground/80">
                                ngày lập đơn
                            </span>
                            {" · "}
                            Đơn trả và hàng trả theo{" "}
                            <span className="text-foreground/80">
                                thời điểm khách nhận (trả đồ)
                            </span>
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-lg border border-border p-0.5 bg-muted/20">
                            {(
                                [
                                    ["day", "Ngày"],
                                    ["month", "Tháng"],
                                    ["year", "Năm"],
                                ] as const
                            ).map(([m, label]) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                        setPeriodMode(m);
                                        if (m === "month")
                                            setMonthValue(dayValue.slice(0, 7));
                                        if (m === "year")
                                            setYearValue(dayValue.slice(0, 4));
                                    }}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                        periodMode === m
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {periodMode === "day" && (
                            <input
                                type="date"
                                value={dayValue}
                                onChange={(e) => setDayValue(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                        )}
                        {periodMode === "month" && (
                            <input
                                type="month"
                                value={monthValue}
                                onChange={(e) => setMonthValue(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                        )}
                        {periodMode === "year" && (
                            <input
                                type="number"
                                min={2000}
                                max={2100}
                                value={yearValue}
                                onChange={(e) => setYearValue(e.target.value)}
                                className="w-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                        )}
                    </div>
                </div>

                <p className="text-sm font-medium text-foreground">
                    Đang xem:{" "}
                    <span className="text-primary">
                        {periodLabelVi(
                            periodSelection.mode,
                            periodSelection.value,
                        )}
                    </span>
                </p>

                {periodLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                        <Loader2 className="animate-spin" size={22} />
                        <span>Đang tải số liệu…</span>
                    </div>
                ) : periodError ? (
                    <p className="text-sm text-danger py-6 text-center">
                        Không tải được số liệu theo kỳ. Vui lòng thử lại.
                    </p>
                ) : periodData ? (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <div className="rounded-xl border border-border bg-muted/10 p-3 md:p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                    <ShoppingBag size={14} />
                                    Đơn tạo
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-foreground mt-2 tabular-nums">
                                    {periodData.ordersCreatedCount}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/10 p-3 md:p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                    <PackageCheck size={14} />
                                    Đơn đã trả
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-foreground mt-2 tabular-nums">
                                    {periodData.ordersReturnedCount}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/10 p-3 md:p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                    <Shirt size={14} />
                                    Hàng tạo
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-foreground mt-2 tabular-nums">
                                    {periodData.itemsCreatedCount}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Dòng hàng mới trong kỳ
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/10 p-3 md:p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                                    <Package size={14} />
                                    Hàng đã trả
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-foreground mt-2 tabular-nums">
                                    {periodData.itemsReturnedCount}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Theo đơn trả trong kỳ
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
                            {(
                                [
                                    [
                                        "itemsCreated",
                                        "Hàng mới tạo",
                                        periodData.itemsCreated.length,
                                    ],
                                    [
                                        "itemsReturned",
                                        "Hàng đã trả",
                                        periodData.itemsReturned.length,
                                    ],
                                    [
                                        "ordersCreated",
                                        "Đơn tạo (chi tiết)",
                                        periodData.ordersCreated.length,
                                    ],
                                    [
                                        "ordersReturned",
                                        "Đơn đã trả (chi tiết)",
                                        periodData.ordersReturned.length,
                                    ],
                                ] as const
                            ).map(([key, label, n]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setListTab(key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                        listTab === key
                                            ? "bg-primary/15 text-primary"
                                            : "text-muted-foreground hover:bg-muted/50"
                                    }`}
                                >
                                    {label}
                                    <span className="ml-1 opacity-70 tabular-nums">
                                        ({n})
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="rounded-lg border border-border overflow-hidden">
                            <div className="overflow-x-auto max-h-[min(420px,55vh)] overflow-y-auto">
                                {listTab === "itemsCreated" && (
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 z-[1] bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Hàng
                                                </th>
                                                <th className="px-4 py-3">
                                                    Đơn
                                                </th>
                                                <th className="px-4 py-3">
                                                    Khách
                                                </th>
                                                <th className="px-4 py-3">
                                                    Trạng thái
                                                </th>
                                                <th className="px-4 py-3 whitespace-nowrap">
                                                    Tạo lúc
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {periodData.itemsCreated.length ===
                                            0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-8 text-center text-muted-foreground italic"
                                                    >
                                                        Không có hàng nào được
                                                        tạo trong kỳ này.
                                                    </td>
                                                </tr>
                                            ) : (
                                                periodData.itemsCreated.map(
                                                    (row) => (
                                                        <tr
                                                            key={row.id}
                                                            className="hover:bg-muted/20"
                                                        >
                                                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px]">
                                                                {row.item_name}
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <Link
                                                                    href="/orders"
                                                                    className="font-mono text-xs text-primary hover:underline"
                                                                >
                                                                    #
                                                                    {String(
                                                                        row.order_id,
                                                                    ).padStart(
                                                                        5,
                                                                        "0",
                                                                    )}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-muted-foreground">
                                                                {
                                                                    row.customer_name
                                                                }
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(row.status)}`}
                                                                >
                                                                    {statusLabel(
                                                                        row.status,
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                                {new Date(
                                                                    row.created_at,
                                                                ).toLocaleString(
                                                                    "vi-VN",
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {listTab === "itemsReturned" && (
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 z-[1] bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Hàng
                                                </th>
                                                <th className="px-4 py-3">
                                                    Đơn
                                                </th>
                                                <th className="px-4 py-3">
                                                    Khách
                                                </th>
                                                <th className="px-4 py-3">
                                                    Trạng thái
                                                </th>
                                                <th className="px-4 py-3 whitespace-nowrap">
                                                    Trả lúc
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {periodData.itemsReturned.length ===
                                            0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-8 text-center text-muted-foreground italic"
                                                    >
                                                        Không có hàng nào thuộc
                                                        đơn đã trả trong kỳ này.
                                                    </td>
                                                </tr>
                                            ) : (
                                                periodData.itemsReturned.map(
                                                    (row) => (
                                                        <tr
                                                            key={row.id}
                                                            className="hover:bg-muted/20"
                                                        >
                                                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px]">
                                                                {row.item_name}
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <Link
                                                                    href="/orders"
                                                                    className="font-mono text-xs text-primary hover:underline"
                                                                >
                                                                    #
                                                                    {String(
                                                                        row.order_id,
                                                                    ).padStart(
                                                                        5,
                                                                        "0",
                                                                    )}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-muted-foreground">
                                                                {
                                                                    row.customer_name
                                                                }
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(row.status)}`}
                                                                >
                                                                    {statusLabel(
                                                                        row.status,
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                                {row.return_time
                                                                    ? new Date(
                                                                          row.return_time,
                                                                      ).toLocaleString(
                                                                          "vi-VN",
                                                                      )
                                                                    : "—"}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {listTab === "ordersCreated" && (
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 z-[1] bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Mã đơn
                                                </th>
                                                <th className="px-4 py-3">
                                                    Khách
                                                </th>
                                                <th className="px-4 py-3">
                                                    Trạng thái
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Tổng tiền
                                                </th>
                                                <th className="px-4 py-3 whitespace-nowrap">
                                                    Tạo lúc
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {periodData.ordersCreated.length ===
                                            0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-8 text-center text-muted-foreground italic"
                                                    >
                                                        Không có đơn nào được
                                                        tạo trong kỳ này.
                                                    </td>
                                                </tr>
                                            ) : (
                                                periodData.ordersCreated.map(
                                                    (o) => (
                                                        <tr
                                                            key={o.id}
                                                            className="hover:bg-muted/20"
                                                        >
                                                            <td className="px-4 py-2.5">
                                                                <Link
                                                                    href="/orders"
                                                                    className="font-bold text-primary hover:underline"
                                                                >
                                                                    #
                                                                    {String(
                                                                        o.id,
                                                                    ).padStart(
                                                                        5,
                                                                        "0",
                                                                    )}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-muted-foreground">
                                                                {
                                                                    o.customer_name
                                                                }
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(o.status)}`}
                                                                >
                                                                    {statusLabel(
                                                                        o.status,
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                                {new Intl.NumberFormat(
                                                                    "vi-VN",
                                                                    {
                                                                        style: "currency",
                                                                        currency:
                                                                            "VND",
                                                                    },
                                                                ).format(
                                                                    o.total_amount,
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                                {new Date(
                                                                    o.created_at,
                                                                ).toLocaleString(
                                                                    "vi-VN",
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {listTab === "ordersReturned" && (
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 z-[1] bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Mã đơn
                                                </th>
                                                <th className="px-4 py-3">
                                                    Khách
                                                </th>
                                                <th className="px-4 py-3">
                                                    Trạng thái
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Tổng tiền
                                                </th>
                                                <th className="px-4 py-3 whitespace-nowrap">
                                                    Trả lúc
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {periodData.ordersReturned
                                                .length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-8 text-center text-muted-foreground italic"
                                                    >
                                                        Không có đơn nào được
                                                        đánh dấu trả trong kỳ
                                                        này.
                                                    </td>
                                                </tr>
                                            ) : (
                                                periodData.ordersReturned.map(
                                                    (o) => (
                                                        <tr
                                                            key={o.id}
                                                            className="hover:bg-muted/20"
                                                        >
                                                            <td className="px-4 py-2.5">
                                                                <Link
                                                                    href="/orders"
                                                                    className="font-bold text-primary hover:underline"
                                                                >
                                                                    #
                                                                    {String(
                                                                        o.id,
                                                                    ).padStart(
                                                                        5,
                                                                        "0",
                                                                    )}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-muted-foreground">
                                                                {
                                                                    o.customer_name
                                                                }
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(o.status)}`}
                                                                >
                                                                    {statusLabel(
                                                                        o.status,
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                                {new Intl.NumberFormat(
                                                                    "vi-VN",
                                                                    {
                                                                        style: "currency",
                                                                        currency:
                                                                            "VND",
                                                                    },
                                                                ).format(
                                                                    o.total_amount,
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                                {o.return_time
                                                                    ? new Date(
                                                                          o.return_time,
                                                                      ).toLocaleString(
                                                                          "vi-VN",
                                                                      )
                                                                    : "—"}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            Số đếm là đủ cho toàn bộ kỳ. Bảng chỉ hiển thị tối
                            đa 150 đơn gần nhất và 200 hàng mới tạo / 400 hàng
                            trong các đơn trả (theo thứ tự thời gian).
                        </p>
                    </>
                ) : null}
            </div>

            {/* Revenue Chart + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 vuexy-card p-4 md:p-6">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <h4 className="text-base md:text-lg font-bold text-foreground">
                            Doanh thu theo tháng
                        </h4>
                    </div>
                    <div className="h-[220px] md:h-[300px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient
                                            id="colorIncome"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="var(--primary)"
                                                stopOpacity={0.15}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--primary)"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="var(--border)"
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fontSize: 12,
                                            fill: "var(--foreground)",
                                        }}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--card)",
                                            borderRadius: "8px",
                                            border: "1px solid var(--border)",
                                            boxShadow:
                                                "0 4px 10px rgba(0,0,0,0.1)",
                                        }}
                                        formatter={(value) => [
                                            new Intl.NumberFormat(
                                                "vi-VN",
                                            ).format(Number(value)) + "đ",
                                            "Doanh thu",
                                        ]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        stroke="var(--primary)"
                                        fillOpacity={1}
                                        fill="url(#colorIncome)"
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                                Chưa có dữ liệu doanh thu
                            </div>
                        )}
                    </div>
                </div>

                <div className="vuexy-card p-4 md:p-6">
                    <h4 className="text-base md:text-lg font-bold text-foreground mb-4 md:mb-6">
                        Hoạt động gần đây
                    </h4>
                    <div className="space-y-5 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {!ordersLoading &&
                            (orders as Order[])?.slice(0, 8).map((order) => (
                                <div
                                    key={order.id}
                                    className="flex gap-3 relative"
                                >
                                    <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5 z-10 shadow-[0_0_0_4px_var(--card)]" />
                                    <div className="absolute left-1 top-3 bottom-0 w-px bg-border" />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">
                                            Đơn #{order.id} —{" "}
                                            {statusLabel(order.status)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {order.customer?.name || "Vãng lai"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
                                            {new Date(
                                                order.created_at,
                                            ).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        {!ordersLoading && (!orders || orders.length === 0) && (
                            <p className="text-sm text-muted-foreground italic text-center py-4">
                                Chưa có hoạt động
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent transactions table */}
            <div className="vuexy-card overflow-hidden">
                <div className="p-4 md:p-6 border-b border-border flex justify-between items-center">
                    <h4 className="text-base md:text-lg font-bold text-foreground">
                        Giao dịch gần đây
                    </h4>
                    <Link
                        href="/orders"
                        className="btn-primary px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md"
                    >
                        Xem tất cả
                    </Link>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Mã đơn</th>
                                <th className="px-6 py-4">Khách hàng</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">
                                    Số tiền
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {ordersLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td
                                            colSpan={4}
                                            className="px-6 py-6 bg-muted/10"
                                        />
                                    </tr>
                                ))
                            ) : orders && orders.length > 0 ? (
                                (orders as Order[]).slice(0, 5).map((order) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-muted/10 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-bold text-primary">
                                            #
                                            {order.id
                                                .toString()
                                                .padStart(5, "0")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-foreground">
                                                {order.customer?.name ||
                                                    "Vãng lai"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.customer?.phone || ""}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColor(order.status)}`}
                                            >
                                                {statusLabel(order.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-foreground">
                                            {new Intl.NumberFormat("vi-VN", {
                                                style: "currency",
                                                currency: "VND",
                                            }).format(order.total_amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-12 text-center text-muted-foreground italic"
                                    >
                                        Không tìm thấy giao dịch nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden divide-y divide-border">
                    {ordersLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="p-4 h-20 animate-pulse bg-muted/10"
                            />
                        ))
                    ) : orders && orders.length > 0 ? (
                        (orders as Order[]).slice(0, 5).map((order) => (
                            <div
                                key={order.id}
                                className="p-4 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-primary text-sm">
                                            #
                                            {order.id
                                                .toString()
                                                .padStart(5, "0")}
                                        </span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusColor(order.status)}`}
                                        >
                                            {statusLabel(order.status)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {order.customer?.name || "Vãng lai"}
                                    </p>
                                </div>
                                <p className="text-sm font-bold text-foreground shrink-0">
                                    {new Intl.NumberFormat("vi-VN", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(order.total_amount)}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-muted-foreground italic text-sm">
                            Không tìm thấy giao dịch nào.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
