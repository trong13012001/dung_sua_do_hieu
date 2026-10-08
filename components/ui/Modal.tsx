'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Mở chồng lên modal khác (vd. in tem từ chi tiết đơn). Radix đã xếp chồng theo thứ tự mở; prop này chỉ nâng z-index cho chắc. */
  stackOnTop?: boolean;
}

/*
 * Lớp tương thích trên shadcn `Dialog` — giữ nguyên props cũ để các trang chưa chuyển vẫn chạy.
 * Code mới dùng thẳng `Dialog` / `AlertDialog`.
 *
 * Đóng là unmount ngay (không chờ animation đóng) như bản cũ: nhiều trang tính `title`/children
 * từ state bị đặt về null khi đóng, nếu giữ nội dung thêm một nhịp animation sẽ đọc phải null.
 */
/*
 * `maxWidth` cũ là class không tiền tố (vd. `max-w-2xl`), nhưng DialogContent đặt `sm:max-w-lg`
 * nên class không tiền tố bị đè từ 640px trở lên. Ánh xạ sang class `sm:` viết sẵn
 * (Tailwind không quét được class ghép chuỗi động).
 */
const SM_MAX_WIDTH: Record<string, string> = {
  'max-w-sm': 'sm:max-w-sm',
  'max-w-md': 'sm:max-w-md',
  'max-w-lg': 'sm:max-w-lg',
  'max-w-xl': 'sm:max-w-xl',
  'max-w-2xl': 'sm:max-w-2xl',
  'max-w-3xl': 'sm:max-w-3xl',
  'max-w-4xl': 'sm:max-w-4xl',
  'max-w-5xl': 'sm:max-w-5xl',
  'max-w-6xl': 'sm:max-w-6xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  stackOnTop = false,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          'flex w-full flex-col gap-4 bg-card p-5 md:p-6 max-h-[90vh] md:max-h-[88vh]',
          SM_MAX_WIDTH[maxWidth] ?? 'sm:max-w-md',
          stackOnTop && 'z-[60]',
        )}
      >
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="text-base md:text-lg font-semibold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">{children}</div>
      </DialogContent>
    </Dialog>
  );
};
