'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useOrderLogs } from '@/api/orderLogs';
import { TextLinesSkeleton } from '@/components/ui/loading-skeletons';
import { cn } from '@/lib/utils';

/** Khối "Lịch sử thay đổi" thu gọn trong form sửa đơn. Chỉ tải log khi mở ra. */
export function OrderLogSection({ orderId }: { orderId: number | null }) {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading } = useOrderLogs(orderId, { enabled: open });
  if (!orderId) return null;
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between bg-muted/40 px-3 py-2 text-left text-[11px] font-bold uppercase text-muted-foreground transition-colors hover:bg-muted"
      >
        Lịch sử thay đổi
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="max-h-40 space-y-2 overflow-y-auto p-3 text-xs">
          {isLoading ? (
            <TextLinesSkeleton lines={3} />
          ) : logs && logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex justify-between gap-2 border-b border-border/50 pb-1.5 text-muted-foreground last:border-0"
              >
                <span>{log.action}</span>
                <span className="shrink-0">
                  {log.user?.name || 'Hệ thống'} · {new Date(log.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
            ))
          ) : (
            <p className="italic text-muted-foreground">Chưa có lịch sử</p>
          )}
        </div>
      )}
    </div>
  );
}
