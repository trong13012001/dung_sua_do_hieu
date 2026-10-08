'use client';

import { forwardRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { InvoicePrintContent } from '@/components/ui/InvoicePrint';
import { PRINT_TARGET_INVOICE_XP80C } from '@/lib/printTargets';
import type { Order } from '@/lib/types';

/**
 * In nhiều phiếu một lượt. Khối `.invoice-print-area` bên dưới được printElementSmart clone
 * nguyên trạng để in nhiệt — giữ đúng class/markup, KHÔNG restyle (skill changing-thermal-printing).
 * `ref` trỏ vào vùng chứa các phiếu để trang gọi tìm `.invoice-print-area`.
 */
export const BatchPrintDialog = forwardRef<
  HTMLDivElement,
  {
    open: boolean;
    onClose: () => void;
    orders: Order[];
    printing: boolean;
    silentReady: boolean;
    onPrint: () => void;
  }
>(function BatchPrintDialog({ open, onClose, orders, printing, silentReady, onPrint }, ref) {
  return (
    <Modal isOpen={open} onClose={onClose} title={`In ${orders.length} phiếu thanh toán`} maxWidth="max-w-2xl">
      <div className="space-y-4 pb-4 print:space-y-0">
        <div className="non-print shrink-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            Bạn đã chọn <strong>{orders.length} đơn</strong>. In sẽ tạo{' '}
            <strong>{orders.length} lần cắt giấy</strong> trên máy nhiệt (mỗi đơn một khổ 80mm, ví dụ{' '}
            <strong>XP-80C</strong>). Chỉ cần một phiếu? Đóng và mở in từ từng đơn.
          </p>
          <p className="text-xs text-muted-foreground">
            Đơn sẽ in: {orders.map((o) => `#${o.id.toString().padStart(5, '0')}`).join(', ')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button onClick={onPrint} disabled={printing || orders.length === 0}>
              {printing
                ? 'Đang in...'
                : silentReady
                  ? `In XP-80C ⚡: ${orders.length} phiếu`
                  : `In XP-80C: ${orders.length} phiếu`}
            </Button>
          </div>
        </div>
        <div ref={ref} className="space-y-6 print:block print:space-y-0">
          {orders.map((order) => (
            <div
              key={order.id}
              data-print-target={PRINT_TARGET_INVOICE_XP80C}
              className="invoice-print-area invoice-xp80c invoice-cs-receipt invoice-page bg-white text-black m-0 max-w-xl p-0 print:max-w-none"
            >
              <div className="invoice-xp80c-body min-w-0">
                <InvoicePrintContent order={order} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
});
