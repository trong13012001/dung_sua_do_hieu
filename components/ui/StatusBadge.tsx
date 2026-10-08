import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { orderStatusBadgeClass, orderStatusLabelVi } from '@/lib/orderStatusUi';
import { orderDetailStatusBadgeClass, orderDetailStatusLabelVi } from '@/lib/orderDetailStatusUi';

interface StatusBadgeProps {
  status: string;
  /** `order` = trạng thái đơn (`orders.status`), `detail` = trạng thái món (`order_details.status`). */
  kind?: 'order' | 'detail';
  /** Ghi đè nhãn (mặc định lấy nhãn tiếng Việt theo `kind`). */
  label?: string;
  className?: string;
}

/** Chip trạng thái dùng chung — màu và nhãn lấy từ `lib/orderStatusUi.ts` / `lib/orderDetailStatusUi.ts`. */
export const StatusBadge = memo(function StatusBadge({ status, kind = 'order', label, className }: StatusBadgeProps) {
  const isDetail = kind === 'detail';
  return (
    <Badge
      variant="ghost"
      className={cn(
        'font-semibold',
        isDetail ? orderDetailStatusBadgeClass(status) : orderStatusBadgeClass(status),
        className,
      )}
    >
      {label ?? (isDetail ? orderDetailStatusLabelVi(status) : orderStatusLabelVi(status))}
    </Badge>
  );
});
