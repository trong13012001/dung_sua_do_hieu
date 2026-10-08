import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/*
 * Skeleton dựng sẵn theo đúng hình dạng nội dung từng màn — dùng thay spinner / "Đang tải…"
 * khi đang lấy dữ liệu lần đầu (`isLoading`). Khi đổi trang/lọc (`isFetching` + keepPreviousData)
 * thì giữ dữ liệu cũ, không hiện skeleton.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Thẻ đơn hàng trong danh sách (Đơn hàng, Trả đồ, Đơn của khách, lịch sử ở POS). */
export const OrderListSkeleton = memo(function OrderListSkeleton({
  rows = 5,
  withCheckbox = false,
}: {
  rows?: number;
  withCheckbox?: boolean;
}) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải danh sách đơn">
      {range(rows).map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-5 flex items-start gap-3 md:gap-4">
          {withCheckbox && <Skeleton className="size-5 rounded mt-1 shrink-0" />}
          <Skeleton className="size-11 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-28 hidden sm:block" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-2 pt-3">
              {range(5).map((j) => (
                <Skeleton key={j} className="size-5" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

/** Lưới thẻ (Khách hàng, Nhân viên, Vai trò). Đặt trực tiếp vào trong grid sẵn có của trang. */
export const CardGridSkeleton = memo(function CardGridSkeleton({
  count = 6,
  variant = 'entity',
}: {
  count?: number;
  /** `entity`: icon + tiêu đề + vài dòng (khách, vai trò). `profile`: avatar tròn giữa thẻ (nhân viên). */
  variant?: 'entity' | 'profile';
}) {
  return (
    <>
      {range(count).map((i) =>
        variant === 'profile' ? (
          <div key={i} className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-6 flex flex-col items-center gap-3" aria-busy="true">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : (
          <div key={i} className="rounded-xl border border-border bg-card shadow-sm p-5 md:p-6 space-y-4" aria-busy="true">
            <div className="flex justify-between items-start">
              <Skeleton className="size-11 rounded-lg" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        ),
      )}
    </>
  );
});

/** Các dòng `<tr>` giả — đặt trong `<tbody>`. */
export const TableRowsSkeleton = memo(function TableRowsSkeleton({
  rows = 5,
  cols,
}: {
  rows?: number;
  cols: number;
}) {
  return (
    <>
      {range(rows).map((i) => (
        <tr key={i} aria-busy="true">
          {range(cols).map((c) => (
            <td key={c} className="px-6 py-4">
              <Skeleton className={cn('h-4', c === 0 ? 'w-12' : c === cols - 1 ? 'w-16 ml-auto' : 'w-3/4')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
});

/** Danh sách dòng đơn giản (bản mobile của bảng). */
export const ListRowsSkeleton = memo(function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {range(rows).map((i) => (
        <div key={i} className="p-4 flex items-center gap-3" aria-busy="true">
          <Skeleton className="size-8 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </>
  );
});

/** Thẻ việc trong một cột Kanban. */
export const TaskCardsSkeleton = memo(function TaskCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {range(count).map((i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2" aria-busy="true">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex justify-between pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="size-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
});

/** Cả bảng Kanban khi chưa có cấu hình cột (vd. màn Việc của tôi đang chờ tài khoản). */
export const KanbanSkeleton = memo(function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {range(columns).map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card shadow-sm p-4 rounded-xl">
          <Skeleton className="h-4 w-24 mb-4" />
          <TaskCardsSkeleton />
        </div>
      ))}
    </div>
  );
});

/** Lưới thẻ số liệu (dashboard). */
export const StatGridSkeleton = memo(function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {range(count).map((i) => (
        <div key={i} className="rounded-xl border border-border bg-muted/10 p-3 md:p-4 space-y-3" aria-busy="true">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
});

/** Khối biểu đồ / bảng lớn. */
export const BlockSkeleton = memo(function BlockSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-64 w-full rounded-xl', className)} />;
});

/** Vài dòng chữ (lịch sử thay đổi, ghi chú). */
export const TextLinesSkeleton = memo(function TextLinesSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {range(lines).map((i) => (
        <div key={i} className="flex justify-between gap-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
});

/** Form cài đặt / hồ sơ: các cặp nhãn + ô nhập. */
export const FormSkeleton = memo(function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 md:p-6 space-y-5" aria-busy="true">
      <Skeleton className="h-5 w-40" />
      {range(fields).map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
});

/** Nội dung modal chi tiết đơn. */
export const OrderDetailSkeleton = memo(function OrderDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải chi tiết đơn">
      <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-xl border border-border">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {range(2).map((i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border divide-y divide-border">
        {range(3).map((i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <div className="space-y-2 w-48">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </div>
  );
});

/** Trang chi tiết khách: tiêu đề + cột thông tin + danh sách đơn. */
export const CustomerOrdersPageSkeleton = memo(function CustomerOrdersPageSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="lg:col-span-3">
          <OrderListSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
});

/** Khung app (sidebar + nội dung) khi đang xác thực phiên đăng nhập. */
export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background flex" aria-busy="true" aria-label="Đang xác thực">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] flex-col gap-6 border-r border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-md" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-3">
          {range(8).map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex-1 lg:ml-[260px] px-4 md:px-8 py-6 space-y-6 max-w-[1440px] mx-auto w-full">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-11 w-full" />
        <OrderListSkeleton rows={4} />
      </div>
    </div>
  );
}
