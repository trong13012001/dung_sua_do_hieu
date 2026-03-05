export type DecodedBarcode =
  | { kind: 'invoice'; orderId: number }
  | { kind: 'item'; orderId: number; detailIndex?: number };

function normalize(raw: string): string {
  return (raw || '').trim().replaceAll(/\D/g, '');
}

/** Encode order id to numeric barcode string (for invoices). */
export function encodeInvoiceBarcode(orderId: number): string {
  if (!Number.isFinite(orderId)) return '';
  return orderId.toString().padStart(11, '0');
}

/** Encode item label barcode: base = invoice code + 2-digit index (01..99). */
export function encodeItemBarcode(orderId: number, index: number): string {
  const base = encodeInvoiceBarcode(orderId);
  const idx = Number.isFinite(index) && index > 0 ? index : 1;
  const suffix = idx.toString().padStart(2, '0');
  return base + suffix;
}

/**
 * Decode scanned barcode:
 * - 13 digits → item label (base 11 digits = order id, last 2 = index)
 * - otherwise → invoice (full number = order id)
 */
export function decodeBarcode(raw: string): DecodedBarcode | null {
  const v = normalize(raw);
  if (!v) return null;

  if (v.length === 13) {
    const base = v.slice(0, 11);
    const idxStr = v.slice(11);
    const orderId = Number(base);
    const detailIndex = Number(idxStr);
    if (!Number.isFinite(orderId) || orderId <= 0) return null;
    return {
      kind: 'item',
      orderId,
      detailIndex: Number.isFinite(detailIndex) && detailIndex > 0 ? detailIndex : undefined,
    };
  }

  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return { kind: 'invoice', orderId: n };
}

