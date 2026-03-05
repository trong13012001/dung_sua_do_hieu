'use client';

import React from 'react';
import {
  TrendingUp,
  Users,
  AlertCircle,
  Briefcase,
  ShoppingBag,
  CheckCircle2
} from 'lucide-react';
import { useOrders } from '@/api/orders';
import { useDashboardStats, useMonthlyRevenue } from '@/api/stats';
import { Order } from '@/lib/types';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from 'recharts';
import Link from 'next/link';

const statusLabel = (s: string) => {
  switch (s) {
    case 'New': return 'Mới';
    case 'In Progress': return 'Đang xử lý';
    case 'Ready': return 'Đã xong';
    case 'Completed': return 'Hoàn thành';
    default: return s;
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case 'New': return 'bg-info/10 text-info';
    case 'In Progress': return 'bg-warning/10 text-warning';
    case 'Ready': return 'bg-success/10 text-success';
    default: return 'bg-secondary/10 text-secondary';
  }
};

export default function DashboardPage() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: stats } = useDashboardStats();
  const { data: monthlyData } = useMonthlyRevenue();

  const chartData = monthlyData?.map(m => ({ name: m.month, income: m.revenue })) || [];

  const dashboardStats = [
    {
      name: 'Doanh thu',
      value: stats ? new Intl.NumberFormat('vi-VN').format(stats.totalRevenue) + 'đ' : '---',
      subValue: 'Tổng cộng',
      icon: TrendingUp,
      color: 'primary',
    },
    {
      name: 'Khách hàng',
      value: stats?.customerCount?.toString() || '0',
      subValue: 'Tổng khách hàng',
      icon: Users,
      color: 'success',
    },
    {
      name: 'Đang xử lý',
      value: stats?.pendingCount?.toString() || '0',
      subValue: 'Đơn chờ làm',
      icon: Briefcase,
      color: 'warning',
    },
    {
      name: 'Tổng nợ',
      value: stats ? new Intl.NumberFormat('vi-VN').format(stats.totalDebt) + 'đ' : '---',
      subValue: 'Chưa thu hồi',
      icon: AlertCircle,
      color: 'danger',
    },
  ];

  const extraStats = [
    { name: 'Tổng đơn hàng', value: stats?.orderCount?.toString() || '0', icon: ShoppingBag, color: 'info' },
    { name: 'Đã hoàn thành', value: stats?.completedCount?.toString() || '0', icon: CheckCircle2, color: 'success' },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {dashboardStats.map((stat) => (
          <div key={stat.name} className="vuexy-card p-3 md:p-5">
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <h3 className="text-base md:text-xl font-bold text-foreground truncate">{stat.value}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{stat.name}</p>
              </div>
              <div className={`p-2 md:p-2.5 rounded-lg bg-${stat.color}/10 text-${stat.color} shrink-0 ml-2`}>
                <stat.icon size={18} className="md:w-[22px] md:h-[22px]" />
              </div>
            </div>
            <div className="mt-2 md:mt-4 text-[11px] md:text-[13px] text-muted-foreground">{stat.subValue}</div>
          </div>
        ))}
      </div>

      {/* Extra stats row */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {extraStats.map(stat => (
          <div key={stat.name} className="vuexy-card p-3 md:p-5 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-${stat.color}/10 text-${stat.color}`}><stat.icon size={20} /></div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-foreground">{stat.value}</h3>
              <p className="text-xs text-muted-foreground">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 vuexy-card p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-bold text-foreground">Doanh thu theo tháng</h4>
          </div>
          <div className="h-[220px] md:h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--foreground)' }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [new Intl.NumberFormat('vi-VN').format(Number(value)) + 'đ', 'Doanh thu']}
                  />
                  <Area type="monotone" dataKey="income" stroke="var(--primary)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">Chưa có dữ liệu doanh thu</div>
            )}
          </div>
        </div>

        <div className="vuexy-card p-4 md:p-6">
          <h4 className="text-base md:text-lg font-bold text-foreground mb-4 md:mb-6">Hoạt động gần đây</h4>
          <div className="space-y-5 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {!ordersLoading && (orders as Order[])?.slice(0, 8).map((order) => (
              <div key={order.id} className="flex gap-3 relative">
                <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5 z-10 shadow-[0_0_0_4px_var(--card)]" />
                <div className="absolute left-1 top-3 bottom-0 w-px bg-border" />
                <div>
                  <p className="text-sm font-bold text-foreground">Đơn #{order.id} — {statusLabel(order.status)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.customer?.name || 'Vãng lai'}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            ))}
            {!ordersLoading && (!orders || orders.length === 0) && (
              <p className="text-sm text-muted-foreground italic text-center py-4">Chưa có hoạt động</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent transactions table */}
      <div className="vuexy-card overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border flex justify-between items-center">
          <h4 className="text-base md:text-lg font-bold text-foreground">Giao dịch gần đây</h4>
          <Link href="/orders" className="btn-primary px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md">Xem tất cả</Link>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Mã đơn</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {ordersLoading ? (
                Array.from({ length: 3 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-6 py-6 bg-muted/10" /></tr>)
              ) : orders && orders.length > 0 ? (
                (orders as Order[]).slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">#{order.id.toString().padStart(5, '0')}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">{order.customer?.name || 'Vãng lai'}</p>
                      <p className="text-xs text-muted-foreground">{order.customer?.phone || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">Không tìm thấy giao dịch nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {ordersLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4 h-20 animate-pulse bg-muted/10" />)
          ) : orders && orders.length > 0 ? (
            (orders as Order[]).slice(0, 5).map(order => (
              <div key={order.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-primary text-sm">#{order.id.toString().padStart(5, '0')}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{order.customer?.name || 'Vãng lai'}</p>
                </div>
                <p className="text-sm font-bold text-foreground shrink-0">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}</p>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground italic text-sm">Không tìm thấy giao dịch nào.</div>
          )}
        </div>
      </div>
    </div>
  );
}
