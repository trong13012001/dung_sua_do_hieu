import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Tiêu đề màn hình + mô tả ngắn + nút hành động bên phải (xuống dòng trên mobile). */
export const PageHeader = memo(function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
});
