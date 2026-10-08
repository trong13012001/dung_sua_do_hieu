import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Khung chung cho các màn ngoài dashboard (đăng nhập, đặt lại mật khẩu). */
export function AuthShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute right-0 top-0 -mr-48 -mt-48 size-96 rounded-full bg-primary/5 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 -mb-48 -ml-48 size-96 rounded-full bg-primary/5 blur-[100px]" />
      <Card className={cn('relative z-10 w-full max-w-[450px] gap-0 p-8 sm:p-10', className)}>{children}</Card>
    </div>
  );
}

/** Thông báo trong form (lỗi / thành công). */
export function AuthNotice({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-6 rounded-md border p-3 text-[13px] font-medium',
        tone === 'error'
          ? 'border-destructive/20 bg-destructive/10 text-destructive'
          : 'border-success/20 bg-success/10 text-success',
      )}
    >
      {children}
    </div>
  );
}
