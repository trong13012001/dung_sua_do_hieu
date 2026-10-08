'use client';

import { memo, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyRevenue } from '@/lib/types';
import { formatNumber } from '@/lib/format';

// Hằng module: prop object/hàm inline sẽ làm recharts vẽ lại SVG mỗi lần trang render.
const AXIS_TICK = { fontSize: 12, fill: 'var(--foreground)' };
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
};
const tooltipFormatter = (value: unknown): [string, string] => [formatNumber(Number(value)) + 'đ', 'Doanh thu'];

/** Biểu đồ doanh thu theo tháng. Số liệu đã cộng sẵn ở SQL (get_monthly_revenue). */
export default memo(function RevenueChart({ data }: { data: MonthlyRevenue[] | undefined }) {
  const chartData = useMemo(() => (data ?? []).map((m) => ({ name: m.month, income: m.revenue })), [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm italic text-muted-foreground">
        Chưa có dữ liệu doanh thu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} />
        <YAxis hide />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={tooltipFormatter} />
        <Area
          type="monotone"
          dataKey="income"
          stroke="var(--primary)"
          fillOpacity={1}
          fill="url(#colorIncome)"
          strokeWidth={3}
          // Poll/realtime làm mới số liệu định kỳ — không chạy lại animation mỗi lần.
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
