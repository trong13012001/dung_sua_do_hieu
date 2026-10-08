'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { useReturnsDueCounts } from '@/api/orders';
import { ORDER_STATUSES_ALLOW_COUNTER_DELIVERY } from '@/lib/orderStatusUi';
import { vnYmd } from '@/lib/vnDate';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Số đơn chưa trả hẹn hôm nay / quá hạn — bấm mở tab tương ứng ở màn Trả đồ. */
export function ReturnsDueCard() {
  const { data, isLoading } = useReturnsDueCounts(ORDER_STATUSES_ALLOW_COUNTER_DELIVERY, vnYmd());
  const dueToday = data?.dueToday ?? 0;
  const overdue = data?.overdue ?? 0;
  const value = (n: number) => (isLoading ? <Skeleton className="inline-block h-6 w-8 align-middle" /> : n);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
      <Link href="/returns?tab=dueToday" className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Card className="flex-row items-center gap-4 p-4 transition-shadow hover:shadow-md md:p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground md:text-sm">Hẹn trả hôm nay</p>
            <p className="text-xl font-black text-foreground md:text-2xl">{value(dueToday)} đơn</p>
          </div>
        </Card>
      </Link>
      <Link href="/returns?tab=overdue" className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Card className="flex-row items-center gap-4 p-4 transition-shadow hover:shadow-md md:p-5">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-lg',
              overdue > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
            )}
          >
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground md:text-sm">Quá hạn chưa trả</p>
            <p className={cn('text-xl font-black md:text-2xl', overdue > 0 ? 'text-destructive' : 'text-foreground')}>
              {value(overdue)} đơn
            </p>
          </div>
        </Card>
      </Link>
    </div>
  );
}
