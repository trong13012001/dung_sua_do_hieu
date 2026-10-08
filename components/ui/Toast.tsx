'use client';

import type { FC } from 'react';
import { toast as sonnerToast } from 'sonner';

/*
 * Lớp tương thích: thông báo giờ đi qua sonner (`<Toaster />` mount ở app/layout.tsx).
 * Các trang cũ vẫn gọi `useToast()` + render `<Toast>`; `showToast` bắn thẳng sang sonner,
 * nên `toast` luôn là null và `<Toast>` không bao giờ render. Code mới: `import { toast } from 'sonner'`.
 * Gỡ file này khi không còn trang nào import.
 */

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

/** @deprecated Dùng `toast()` của sonner. Không còn render gì. */
export const Toast: FC<ToastProps> = () => null;

function showToast(message: string, type: ToastType = 'info') {
  sonnerToast[type](message);
}

function hideToast() {}

interface UseToastResult {
  /** Luôn null — giữ lại để `{toast && <Toast …/>}` ở trang cũ vẫn type-check. */
  toast: { message: string; type: ToastType } | null;
  showToast: typeof showToast;
  hideToast: typeof hideToast;
}

/** @deprecated Dùng `toast()` của sonner. Hàm trả về ổn định giữa các lần render. */
export const useToast = (): UseToastResult => ({ toast: null, showToast, hideToast });
