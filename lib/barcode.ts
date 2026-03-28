/** Mã vạch / mã in — đồng bộ với WPF (Zen Code128 + maGD 11 số). */

export type DecodedBarcode =
  | { kind: 'invoice'; transactionCode: string }
  | { kind: 'item'; transactionCode: string; lineIndex: number }
  /** Đơn cũ web: id pad 11 (không cùng quy tắc WPF) */
  | { kind: 'legacy_invoice'; orderId: number };

function normalize(raw: string): string {
  return (raw || '').trim().replaceAll(/\D/g, '');
}

/** maGD WPF: đúng 11 chữ số và kết thúc bằng "00". */
export function isWpfTransactionCode(s: string | null | undefined): boolean {
  const t = (s || '').trim();
  return /^\d{11}$/.test(t) && t.endsWith('00');
}

/**
 * Chuỗi in barcode hóa đơn: ưu tiên transaction_code (DB); fallback pad id (đơn chưa migrate).
 */
export function invoiceBarcodeFromOrder(order: { id: number; transaction_code?: string | null }): string {
  const tc = order.transaction_code?.trim() ?? '';
  if (isWpfTransactionCode(tc)) return tc;
  return String(order.id).padStart(11, '0');
}

/**
 * Số hiển thị "No …" giống WPF: maGD.Substring(6, 3) — 3 số thứ tự trong ngày.
 */
export function invoiceDisplayNoFromBarcodeCode(code: string): string {
  const c = (code || '').trim();
  if (c.length >= 9) return c.slice(6, 9);
  if (c.length >= 3) return c.slice(-3);
  return c.padStart(3, '0');
}

/**
 * Tem từng món — giống pd_PrintPage2 C#:
 * stt &lt; 10: maGD.Substring(0, 9) + "0" + stt
 * ngược lại: maGD.Substring(0, 9) + stt
 */
export function encodeItemBarcodeMaGd(maGd: string, lineIndex: number): string {
  const stt = Number.isFinite(lineIndex) && lineIndex > 0 ? Math.floor(lineIndex) : 1;
  const base = (maGd || '').trim();
  if (base.length < 9) {
    return base + String(stt).padStart(2, '0');
  }
  if (stt < 10) {
    return base.slice(0, 9) + '0' + stt;
  }
  return base.slice(0, 9) + String(stt);
}

/**
 * Tem món: dùng maGD WPF nếu có; không thì format cũ 11+2 digit (web legacy).
 */
export function encodeItemBarcodeFromOrder(
  order: { id: number; transaction_code?: string | null },
  lineIndex: number
): string {
  const maGd = invoiceBarcodeFromOrder(order);
  if (isWpfTransactionCode(maGd)) {
    return encodeItemBarcodeMaGd(maGd, lineIndex);
  }
  return String(order.id).padStart(11, '0') + String(lineIndex).padStart(2, '0');
}

/**
 * Decode quét máy:
 * - 11 số kết thúc 00 → hóa đơn (transaction_code)
 * - 11 số dạng (9 số)(0)(1-9) → tem món 1–9
 * - ≥12 số, 11 số đầu kết thúc 00 → tem món (stt phần còn lại)
 * - còn lại: legacy theo id (pad cũ)
 */
export function decodeBarcode(raw: string): DecodedBarcode | null {
  const v = normalize(raw);
  if (!v) return null;

  if (v.length === 11 && v.endsWith('00')) {
    return { kind: 'invoice', transactionCode: v };
  }

  if (v.length >= 12 && v.length <= 15) {
    const head = v.slice(0, 11);
    if (head.endsWith('00')) {
      const rest = v.slice(11);
      const lineIndex = Number.parseInt(rest, 10);
      if (Number.isFinite(lineIndex) && lineIndex > 0) {
        return { kind: 'item', transactionCode: head, lineIndex };
      }
    }
  }

  if (v.length === 11 && /^(\d{9})0([1-9])$/.test(v)) {
    const transactionCode = v.slice(0, 9) + '00';
    const lineIndex = Number.parseInt(v.slice(9), 10);
    if (Number.isFinite(lineIndex) && lineIndex > 0) {
      return { kind: 'item', transactionCode, lineIndex };
    }
  }

  const n = Number.parseInt(v, 10);
  if (Number.isFinite(n) && n > 0 && v.length <= 11 && !(v.length === 11 && v.endsWith('00'))) {
    if (!/^(\d{9})0([1-9])$/.test(v)) {
      return { kind: 'legacy_invoice', orderId: n };
    }
  }

  return null;
}
