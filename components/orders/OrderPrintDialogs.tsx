'use client';

import { Modal } from '@/components/ui/Modal';
import { InvoicePrint } from '@/components/ui/InvoicePrint';
import { ItemLabelsPrint } from '@/components/ui/ItemLabelsPrint';
import type { Order } from '@/lib/types';

/*
 * Khung hộp thoại quanh các component in. Bản thân InvoicePrint / ItemLabelsPrint KHÔNG đổi
 * (khổ giấy nhiệt, @media print) — xem skill changing-thermal-printing.
 */

const pad5 = (id: number) => id.toString().padStart(5, '0');

/** Xem trước + in phiếu thanh toán. */
export function InvoicePrintDialog({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <Modal
      isOpen={!!order}
      onClose={onClose}
      title={order ? `Phiếu thanh toán #${pad5(order.id)}` : 'Phiếu thanh toán'}
      maxWidth="max-w-2xl"
    >
      <div className="pb-4 print:block">{order && <InvoicePrint order={order} onClose={onClose} />}</div>
    </Modal>
  );
}

/** In tem barcode cho cả đơn, hoặc chỉ một số dòng (`lineIndices1Based`). */
export function ItemLabelsPrintDialog({
  order,
  lineIndices1Based,
  onClose,
}: {
  order: Order | null;
  lineIndices1Based?: number[] | null;
  onClose: () => void;
}) {
  const single = lineIndices1Based?.length === 1;
  return (
    <Modal
      isOpen={Boolean(order?.details?.length)}
      stackOnTop
      onClose={onClose}
      title={
        order
          ? single
            ? `In tem 1 món · Đơn #${pad5(order.id)}`
            : `In tem barcode đơn #${pad5(order.id)}`
          : 'In tem barcode'
      }
      maxWidth="max-w-lg"
    >
      {order?.details?.length ? (
        <ItemLabelsPrint
          orderId={order.id}
          transactionCode={order.transaction_code}
          items={order.details.map((d) => ({
            name: d.item_name,
            description: d.description || undefined,
          }))}
          lineIndices1Based={lineIndices1Based?.length ? lineIndices1Based : undefined}
          customerName={order.customer?.name ?? null}
          customerAddress={order.customer?.address ?? null}
          returnTime={order.return_time ?? null}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
