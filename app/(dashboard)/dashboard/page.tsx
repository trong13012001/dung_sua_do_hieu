"use client";

import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRecentOrders } from "@/api/orders";
import { useMonthlyRevenue } from "@/api/stats";
import { ROUTE_PERMISSIONS } from "@/lib/permissions";
import { Can } from "@/components/auth/Can";
import { Card } from "@/components/ui/card";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";
import { BlockSkeleton } from "@/components/ui/loading-skeletons";
import { ReturnsDueCard } from "./_components/ReturnsDueCard";
import { PeriodAnalytics } from "./_components/PeriodAnalytics";
import { RecentActivity, RecentTransactions } from "./_components/RecentOrders";

// recharts nặng → tải riêng, không chặn phần còn lại của dashboard.
const RevenueChart = dynamic(() => import("./_components/RevenueChart"), {
    ssr: false,
    loading: () => <BlockSkeleton className="h-full" />,
});

export default function DashboardPage() {
    const [detailModalOrderId, setDetailModalOrderId] = useState<number | string | null>(null);
    const openOrder = useCallback((orderId: number) => setDetailModalOrderId(orderId), []);

    const { data: orders, isLoading: ordersLoading } = useRecentOrders(8);
    const { data: monthlyData } = useMonthlyRevenue();

    return (
        <div className="space-y-4 md:space-y-6">
            <Can anyOf={ROUTE_PERMISSIONS["/returns"]}>
                <ReturnsDueCard />
            </Can>

            <PeriodAnalytics onOpenOrder={openOrder} />

            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
                <Card className="gap-4 p-4 md:p-6 lg:col-span-2">
                    <h2 className="text-base font-bold text-foreground md:text-lg">Doanh thu theo tháng</h2>
                    <div className="h-[220px] w-full md:h-[300px]">
                        <RevenueChart data={monthlyData} />
                    </div>
                </Card>
                <RecentActivity orders={orders} isLoading={ordersLoading} />
            </div>

            <RecentTransactions orders={orders} isLoading={ordersLoading} />

            <OrderDetailModal
                isOpen={detailModalOrderId !== null}
                onClose={() => setDetailModalOrderId(null)}
                orderId={detailModalOrderId}
            />
        </div>
    );
}
