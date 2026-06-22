/** Lề @page khi in từ trình duyệt (globals.css) — 80mm nhiệt. */
export const INVOICE_PAGE_MARGIN_MM = 2 as const;

/**
 * Lề @page trong HTML job in nhiệt — hẹp hơn một chút để tăng vùng in thực tế,
 * giảm cắt mép phải trên một số driver XP-80C.
 */
export const THERMAL_INVOICE_HTML_PAGE_MARGIN_MM = 1.25 as const;

/**
 * Chiều cao một @page hóa đơn nhiệt (mm) — chỉ dùng làm **fallback** khi không đo được
 * chiều cao thật (SSR / không có DOM). Khi chạy trong trình duyệt, `buildPrintHtml` đo
 * đúng chiều cao nội dung rồi đặt @page bằng đúng số đó (xem `invoiceThermalMaxPageHeightMm`).
 *
 * Lý do không để `auto`: Chromium/Electron khi map sang `pageSize` microns hay rơi về ~240mm
 * → bill dài bị cắt trang / nhảy STT. Đồng bộ `electron/main.cjs` (fallback khi parse `auto`).
 */
export const THERMAL_INVOICE_HTML_PAGE_HEIGHT_MM = 2000 as const;

/**
 * Đệm thêm vào chiều cao đo được trước khi đặt @page. Luôn **làm trang cao hơn nội dung một chút**:
 * trang cao dư → máy chỉ thừa vài mm giấy trắng (cắt là xong); trang thiếu → driver co nhỏ "cho vừa
 * trang" (lỗi dải li ti) hoặc lẹm dòng cuối. Vậy luôn nghiêng về dư để tuyệt đối không co nhỏ.
 */
export const THERMAL_INVOICE_PAGE_HEIGHT_SLACK_MM = 12 as const;

/** Chiều cao @page tối thiểu (mm) — đơn 1 món vẫn đủ chỗ header + footer. */
export const THERMAL_INVOICE_MIN_PAGE_HEIGHT_MM = 80 as const;

/**
 * Chặn trên **vệ sinh (sanity bound)** cho chiều cao @page hóa đơn (mm) — KHÔNG phải để ép co.
 *
 * Best practice máy in nhiệt cuộn: `@page` cao **đúng bằng nội dung thật** (xem đo trong
 * `buildPrintHtml`) → một phiếu liền mạch, máy cắt theo nội dung. Trang luôn ≥ nội dung nên
 * không bao giờ bị driver "co cho vừa trang" (lỗi dải li ti). Số này chỉ chặn trường hợp bất
 * thường (nội dung khổng lồ / đo sai) để không quay lại khổ ~2000mm vốn làm driver cắt/treo.
 *
 * Mặc định 1500mm (≈ trên 100 món — không đơn thực tế nào chạm tới, nên thực chất luôn vừa
 * khít nội dung). Tinh chỉnh hiếm khi cần: `NEXT_PUBLIC_THERMAL_INVOICE_MAX_PAGE_MM`.
 */
export function invoiceThermalMaxPageHeightMm(): number {
  const raw = process.env.NEXT_PUBLIC_THERMAL_INVOICE_MAX_PAGE_MM?.trim();
  const def = 1500;
  if (!raw) return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  /* Giữ dưới ~2000mm (khổ làm driver cắt/treo); chặn trong [120, 1900]. */
  return Math.max(120, Math.min(1900, Math.round(n)));
}

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
