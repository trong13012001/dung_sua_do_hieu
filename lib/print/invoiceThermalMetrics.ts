/** Lề @page khi in từ trình duyệt (globals.css) — 80mm nhiệt. */
export const INVOICE_PAGE_MARGIN_MM = 2 as const;

/**
 * Lề @page trong HTML job in nhiệt — hẹp hơn một chút để tăng vùng in thực tế,
 * giảm cắt mép phải trên một số driver XP-80C.
 */
export const THERMAL_INVOICE_HTML_PAGE_MARGIN_MM = 1.25 as const;

/** Rộng vùng nội dung sau @page (theo margin trình duyệt 2mm). */
export function invoicePaperContentInnerMm(paperWidthMm: number): number {
  return Math.max(36, paperWidthMm - 2 * INVOICE_PAGE_MARGIN_MM);
}

/** Nội dung sau @page trong job HTML in nhiệt (margin 1.25mm). */
export function invoiceThermalPaperInnerMm(paperWidthMm: number): number {
  return Math.max(
    36,
    paperWidthMm - 2 * THERMAL_INVOICE_HTML_PAGE_MARGIN_MM,
  );
}

/** Thêm mm thu hẹp nội dung khi máy nhiệt cắt mép phải so với Chrome (preview). */
function invoiceThermalExtraTrimMm(): number {
  const raw = process.env.NEXT_PUBLIC_THERMAL_INVOICE_EXTRA_TRIM_MM?.trim();
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 8) return 0;
  return n;
}

/**
 * Max-width khối `.invoice-print-area` trong HTML job + preview iframe.
 * Trừ thêm ~3mm so với vùng sau @page: vùng in thực XP-80C thường hẹp hơn viewport Chrome.
 * Tinh chỉnh: NEXT_PUBLIC_THERMAL_INVOICE_EXTRA_TRIM_MM (vd. 1) nếu vẫn lẹm.
 */
export function invoiceThermalLayoutMaxWidthMm(paperWidthMm: number): number {
  const safetyMm = 3 + invoiceThermalExtraTrimMm();
  return Math.max(32, invoiceThermalPaperInnerMm(paperWidthMm) - safetyMm);
}

/**
 * Viewport HTML (inch): **đúng khổ giấy** — tránh scale lệch.
 */
export function invoiceThermalViewportWidthMm(paperWidthMm: number): number {
  return paperWidthMm;
}
