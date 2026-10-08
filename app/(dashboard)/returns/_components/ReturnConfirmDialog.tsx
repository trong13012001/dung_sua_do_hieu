'use client';

import { PackageCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Order } from '@/lib/types';
import { formatNumber, formatVnd } from '@/lib/format';

export function ReturnConfirmDialog({
  open,
  onOpenChange,
  order,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  isPending: boolean;
  onConfirm: () => void;
}) {
  const debt = order ? order.total_amount - (order.paid_amount || 0) : 0;
  const paid = Number(order?.paid_amount || 0);
  const nextWhenOwing =
    order && paid > 0 && paid < order.total_amount ? 'Trả thiếu tiền' : 'Đã trả đồ (chưa thu gì — còn nợ đủ)';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xác nhận trả đồ</DialogTitle>
          <DialogDescription>
            Trạng thái sẽ là <span className="font-bold text-primary">Đã trả đồ</span> nếu đã thu đủ hoặc chưa thu; nếu đã
            thu một phần thì <span className="font-bold text-orange-700">Trả thiếu tiền</span>.
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between text-sm font-bold text-foreground">
                <span>Đơn #{order.id.toString().padStart(5, '0')}</span>
                <span>{formatVnd(order.total_amount)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <UserCheck size={14} className="text-primary" />
                <span className="font-medium">{order.customer?.name || 'Vãng lai'}</span>
                {order.customer?.phone && <span className="text-muted-foreground">- {order.customer.phone}</span>}
              </div>
              {order.details && order.details.length > 0 && (
                <div className="space-y-1.5 border-t border-primary/10 pt-3">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Danh sách đồ</p>
                  {order.details.map((d, i) => (
                    <div key={d.id ?? i} className="flex justify-between gap-3 text-sm">
                      <span className="text-foreground">{d.item_name}</span>
                      <span className="shrink-0 text-muted-foreground">{formatNumber(d.unit_price)}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {debt > 0 && (
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
                <p className="text-xs font-bold leading-relaxed text-warning">
                  Còn nợ {formatNumber(debt)}đ. Sau khi xác nhận trả đồ, trạng thái đơn:{' '}
                  <span className="text-foreground">{nextWhenOwing}</span>.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button disabled={isPending || !order} onClick={onConfirm}>
            {isPending ? (
              'Đang xử lý...'
            ) : (
              <>
                <PackageCheck /> Xác nhận trả đồ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
