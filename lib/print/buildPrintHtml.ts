import { flattenCssImports, fetchText } from "@/lib/print/inlineCssImports";
import {
  THERMAL_INVOICE_HTML_PAGE_MARGIN_MM,
  invoiceThermalLayoutMaxWidthMm,
  invoiceThermalViewportWidthMm,
  THERMAL_INVOICE_HTML_PAGE_HEIGHT_MM,
  THERMAL_INVOICE_PAGE_HEIGHT_SLACK_MM,
  THERMAL_INVOICE_MIN_PAGE_HEIGHT_MM,
  invoiceThermalMaxPageHeightMm,
} from "@/lib/print/invoiceThermalMetrics";
import {
  LABEL_THERMAL_PAGE_HEIGHT_MM,
  LABEL_THERMAL_PAPER_WIDTH_MM,
} from "@/lib/print/labelThermalMetrics";

/**
 * HTML in nhiệt: viewport + `pageWidth` = **khổ giấy**; `@page` margin trong CSS tạo vùng nội dung —
 * `.invoice-print-area` max-width theo nội dung, căn trái (không auto margin).
 */

function escapeForStyleTag(css: string): string {
  return css.replace(/<\/style/gi, "</\u200cstyle");
}

function expandPrintMediaForThermal(css: string): string {
  let out = css.replace(
    /@media print(?!\s*,)(?!\s+and\b)\s*\{/gi,
    "@media print, screen {",
  );
  /* Tailwind / theme: @media print and (…) — engine in nhiệt cần screen trong chuỗi media */
  out = out.replace(
    /@media print(\s+and\s*\([^)]+\))\s*\{/gi,
    "@media print, screen$1 {",
  );
  return out;
}

function mmToCssPx(mm: number): number {
  return Math.round((mm / 25.4) * 96);
}

/**
 * Gỡ mọi `@page { … }` / `@page name { … }` khỏi CSS đã flatten — job tem tự chèn một `@page` duy nhất.
 * Regex từng block 80mm dễ sót (minify, thứ tự property, file khác).
 */
function stripAllAtPageRules(css: string): string {
  const re = /@page\b/gi;
  let out = "";
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const idx = m.index;
    const before = idx > 0 ? css[idx - 1]! : " ";
    if (/[A-Za-z0-9_-]/.test(before)) {
      out += css.slice(i, idx + 1);
      i = idx + 1;
      re.lastIndex = i;
      continue;
    }
    out += css.slice(i, idx);
    let j = idx + m[0].length;
    while (j < css.length && /\s/.test(css[j]!)) j++;
    while (j < css.length && /[\w-]/.test(css[j]!)) j++;
    while (j < css.length && /\s/.test(css[j]!)) j++;
    if (j >= css.length || css[j] !== "{") {
      out += css.slice(idx, j);
      i = j;
      re.lastIndex = i;
      continue;
    }
    let depth = 1;
    j++;
    while (j < css.length && depth > 0) {
      const c = css[j]!;
      if (c === "{") depth++;
      else if (c === "}") depth--;
      j++;
    }
    i = j;
    re.lastIndex = i;
  }
  out += css.slice(i);
  return out;
}

/** Job tem: bỏ toàn bộ @page + thuộc tính `page:` (named page) trong bundle — tránh xung đột với @page của job. */
function sanitizeCssForLabelPrintJob(css: string): string {
  let s = stripAllAtPageRules(css);
  s = s.replace(/\bpage\s*:\s*[^;\r\n}]+;?/gi, "");
  return s;
}

/**
 * Bản dự phòng utility Tailwind trong `.invoice-xp80c` — một số engine in có thể
 * bỏ qua @layer / CSS mới; rule nằm sau bundle gốc.
 */
function invoiceThermalTailwindFallback(layoutMaxMm: number): string {
  return `
@media print, screen {
html.thermal-print #print-root .invoice-xp80c .flex { display: flex !important; }
html.thermal-print #print-root .invoice-xp80c .flex-row { flex-direction: row !important; }
html.thermal-print #print-root .invoice-xp80c .flex-col { flex-direction: column !important; }
html.thermal-print #print-root .invoice-xp80c .items-start { align-items: flex-start !important; }
html.thermal-print #print-root .invoice-xp80c .justify-between { justify-content: space-between !important; }
html.thermal-print #print-root .invoice-xp80c .text-left { text-align: left !important; }
html.thermal-print #print-root .invoice-xp80c .text-center { text-align: center !important; }
html.thermal-print #print-root .invoice-xp80c .text-right { text-align: right !important; }
html.thermal-print #print-root .invoice-xp80c .w-full { width: 100% !important; }
html.thermal-print #print-root .invoice-xp80c .min-w-0 { min-width: 0 !important; }
html.thermal-print #print-root .invoice-xp80c .shrink-0 { flex-shrink: 0 !important; }
html.thermal-print #print-root .invoice-xp80c .border-collapse { border-collapse: collapse !important; }
html.thermal-print #print-root .invoice-xp80c .whitespace-nowrap { white-space: nowrap !important; }
html.thermal-print #print-root .invoice-xp80c .font-bold { font-weight: 700 !important; }
html.thermal-print #print-root .invoice-xp80c .font-semibold { font-weight: 600 !important; }
html.thermal-print #print-root .invoice-xp80c .leading-tight { line-height: 1.25 !important; }
html.thermal-print #print-root .invoice-xp80c .leading-snug { line-height: 1.375 !important; }
html.thermal-print #print-root .invoice-xp80c .leading-none { line-height: 1 !important; }
html.thermal-print #print-root .invoice-xp80c .m-0 { margin: 0 !important; }
html.thermal-print #print-root .invoice-xp80c .gap-0 { gap: 0 !important; }
html.thermal-print #print-root .invoice-xp80c .mt-0\\.5 { margin-top: 0.125rem !important; }
html.thermal-print #print-root .invoice-xp80c .align-top { vertical-align: top !important; }
html.thermal-print #print-root .invoice-xp80c .align-bottom { vertical-align: bottom !important; }
html.thermal-print #print-root .invoice-xp80c .object-contain { object-fit: contain !important; }
html.thermal-print #print-root .invoice-xp80c .object-left { object-position: left top !important; }
html.thermal-print #print-root .invoice-xp80c .uppercase { text-transform: uppercase !important; }
html.thermal-print #print-root .invoice-xp80c .tracking-wide { letter-spacing: 0.025em !important; }
html.thermal-print #print-root .invoice-xp80c .tabular-nums { font-variant-numeric: tabular-nums !important; }
html.thermal-print #print-root .invoice-xp80c .gap-2 { gap: 0.5rem !important; }
html.thermal-print #print-root .invoice-xp80c .mb-2 { margin-bottom: 0.5rem !important; }
html.thermal-print #print-root .invoice-xp80c .mt-1 { margin-top: 0.25rem !important; }
html.thermal-print #print-root .invoice-xp80c .mt-2 { margin-top: 0.5rem !important; }
html.thermal-print #print-root .invoice-xp80c .mt-3 { margin-top: 0.75rem !important; }
html.thermal-print #print-root .invoice-xp80c .mt-4 { margin-top: 1rem !important; }
html.thermal-print #print-root .invoice-xp80c .mt-6 { margin-top: 1.5rem !important; }
html.thermal-print #print-root .invoice-xp80c .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
html.thermal-print #print-root .invoice-xp80c .px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
html.thermal-print #print-root .invoice-xp80c .pl-1 { padding-left: 0.25rem !important; }
html.thermal-print #print-root .invoice-xp80c .pr-1 { padding-right: 0.25rem !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[6px\\] { font-size: 6px !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[7px\\] { font-size: 7px !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[8px\\] { font-size: 8px !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[9px\\] { font-size: 9px !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[10px\\] { font-size: 10px !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[11px\\] { font-size: 11px !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[12px\\] { font-size: 12px !important; }
html.thermal-print #print-root .invoice-xp80c .text-\\[14px\\] { font-size: 14px !important; }
html.thermal-print #print-root .invoice-xp80c .w-8 { width: 2rem !important; }
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table { table-layout: fixed !important; width: 100% !important; }
html.thermal-print #print-root .invoice-xp80c table { font-size: 9pt !important; }
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table th,
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table td {
  padding: 0.1rem 0.1rem !important;
  vertical-align: top !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table td:nth-child(2) > div {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1.35 !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table th:nth-child(1),
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table td:nth-child(1) {
  width: 5.5mm !important;
  max-width: 6.5mm !important;
  text-align: left !important;
  box-sizing: border-box !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table th:nth-child(2),
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table td:nth-child(2) {
  text-align: left !important;
  width: auto !important;
  min-width: 0 !important;
  overflow-wrap: anywhere !important;
  word-wrap: break-word !important;
  box-sizing: border-box !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table th:nth-child(3),
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table td:nth-child(3) {
  width: 21mm !important;
  min-width: 21mm !important;
  max-width: 21mm !important;
  text-align: right !important;
  padding-left: 0.08rem !important;
  padding-right: 0.35mm !important;
  white-space: nowrap !important;
  overflow: visible !important;
  box-sizing: border-box !important;
}
html.thermal-print .invoice-print-area:not(.item-labels-print) {
  max-width: calc(${layoutMaxMm}mm - 3mm) !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-right: 3mm !important;
  box-sizing: border-box !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-xp80c-body {
  overflow: visible !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-xp80c-details p {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-xp80c-meta p:not(.shrink-0) {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
}
html.thermal-print #print-root .invoice-xp80c .invoice-xp80c-meta p.shrink-0 {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: nowrap !important;
}
/* Hóa đơn dài chia trang: không tách một dòng món / dòng tổng tiền ngang qua mép trang. */
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table thead { display: table-header-group !important; }
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table tr,
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table td,
html.thermal-print #print-root .invoice-xp80c .invoice-cs-table th {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
}
`.trim();
}

const THERMAL_MERGED_INVOICES_SHIM = `
@media print, screen {
  html.thermal-print #print-root .thermal-merged-invoice-host > .invoice-print-area.invoice-page {
    page-break-before: auto !important;
    page-break-after: auto !important;
    break-before: auto !important;
    break-after: auto !important;
  }
}
`.trim();

export interface BuildPrintableHtmlOptions {
  readonly paperWidthMm?: number;
}

/**
 * Đo chiều cao thật của nội dung in (mm) bằng cách render HTML đã dựng vào iframe ẩn
 * đúng bề rộng layout nhiệt — `@page`/viewport bị bỏ qua trên màn hình nên chiều cao
 * iframe chính là chiều cao nội dung dòng chảy. Trả `null` nếu không có DOM (SSR) hoặc lỗi.
 */
async function measureThermalContentHeightMm(
  fullHtml: string,
  layoutWpx: number,
): Promise<number | null> {
  if (typeof document === "undefined" || !document.body) return null;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${Math.round(layoutWpx)}px`,
    "height:10px",
    "border:0",
    "visibility:hidden",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const t = globalThis.setTimeout(done, 4_000);
      iframe.onload = () => {
        globalThis.clearTimeout(t);
        done();
      };
      iframe.srcdoc = fullHtml;
    });
    const doc = iframe.contentDocument;
    if (!doc) return null;
    try {
      const f = (doc as Document & { fonts?: { ready?: Promise<unknown> } })
        .fonts;
      if (f?.ready) await f.ready;
    } catch {
      /* ignore */
    }
    const root = doc.getElementById("print-root") ?? doc.body;
    if (!root) return null;
    const px = Math.max(
      root.scrollHeight,
      Math.ceil(root.getBoundingClientRect().height),
      doc.body?.scrollHeight ?? 0,
    );
    if (!Number.isFinite(px) || px <= 0) return null;
    return (px / 96) * 25.4;
  } catch {
    return null;
  } finally {
    iframe.remove();
  }
}

export async function buildPrintableHtmlFromElement(
  el: HTMLElement,
  opts?: BuildPrintableHtmlOptions,
): Promise<string> {
  const origin = globalThis.location.origin;

  const styleBlocks: string[] = [];
  for (const node of document.querySelectorAll("style")) {
    const t = node.textContent?.trim();
    if (t) styleBlocks.push(t);
  }

  const hrefs = [
    ...new Set(
      [...document.querySelectorAll('link[rel="stylesheet"]')]
        .map((n) => (n as HTMLLinkElement).href)
        .filter(Boolean),
    ),
  ];

  for (const href of hrefs) {
    const raw = await fetchText(href);
    if (!raw) continue;
    const flattened = await flattenCssImports(
      raw,
      href,
      new Set([href]),
      0,
    );
    styleBlocks.push(flattened);
  }

  let combined = expandPrintMediaForThermal(styleBlocks.join("\n\n"));

  const wrapper = el.cloneNode(true) as HTMLElement;
  wrapper.querySelectorAll(".non-print").forEach((n) => n.remove());

  const isInvoice =
    wrapper.classList.contains("invoice-xp80c") ||
    Boolean(wrapper.querySelector(".invoice-xp80c"));
  const paperMm = opts?.paperWidthMm ?? (isInvoice ? 80 : LABEL_THERMAL_PAPER_WIDTH_MM);

  if (
    isInvoice &&
    (wrapper.classList.contains("thermal-merged-invoice-host") ||
      wrapper.querySelector(".thermal-merged-invoice-host"))
  ) {
    combined += `\n\n${THERMAL_MERGED_INVOICES_SHIM}`;
  }

  if (!isInvoice) {
    combined = sanitizeCssForLabelPrintJob(combined);
  }

  const inlinedCss = escapeForStyleTag(combined);

  const layoutWpx = isInvoice ? mmToCssPx(invoiceThermalViewportWidthMm(paperMm)) : null;
  const viewportTag =
    layoutWpx == null
      ? ""
      : `<meta name="viewport" content="width=${layoutWpx}, initial-scale=1, maximum-scale=1, user-scalable=no"/>\n`;

  const rootBox =
    layoutWpx == null
      ? ""
      : `html.thermal-print #print-root { width: 100% !important; max-width: none !important; box-sizing: border-box !important; overflow-x: visible !important; margin: 0 !important; padding: 0 !important; }\n`;

  const htmlBodyCss =
    layoutWpx == null
      ? `html, body { margin: 0 !important; padding: 0 !important; background: white !important; overflow-x: visible !important; overflow-y: visible !important; }\nhtml.thermal-print #print-root { max-width: ${paperMm}mm !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; overflow: visible !important; }\n`
      : `html, body { margin: 0 !important; padding: 0 !important; background: white !important; overflow-x: visible !important; overflow-y: visible !important; }\n`;

  const chromeParity =
    layoutWpx == null
      ? ""
      : `@media print, screen {
  html.thermal-print { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  html.thermal-print .invoice-xp80c {
    -webkit-font-smoothing: none;
    font-smooth: never;
    text-rendering: optimizeSpeed;
  }
}\n`;

  const invoiceMonoCss =
    layoutWpx == null
      ? ""
      : `@media print, screen {
  html.thermal-print .invoice-xp80c,
  html.thermal-print .invoice-xp80c p,
  html.thermal-print .invoice-xp80c span,
  html.thermal-print .invoice-xp80c td,
  html.thermal-print .invoice-xp80c th,
  html.thermal-print .invoice-xp80c div,
  html.thermal-print .invoice-xp80c li {
    color: #000 !important;
  }
}\n`;

  const tailStyle = isInvoice
    ? `<style type="text/css" data-thermal-invoice-fallback="1">\n${escapeForStyleTag(invoiceThermalTailwindFallback(invoiceThermalLayoutMaxWidthMm(paperMm)))}\n</style>`
    : `<style type="text/css" data-thermal-label-pagination="">
@media print, screen {
  html.thermal-print #print-root:has(.item-labels-print) {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .item-labels-print .item-labels-print-body {
    margin: 0 !important;
    padding: 0 !important;
  }
  .item-labels-print .item-label-page {
    page-break-after: always !important;
    break-after: page !important;
    page-break-before: avoid !important;
    break-before: avoid-page !important;
  }
  .item-labels-print .item-label-page:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .item-labels-print .item-label-row {
    display: block !important;
    visibility: visible !important;
  }
}
</style>`;

  const buildDoc = (pageHeightMm: number): string => {
    const pageCss = isInvoice
      ? `@page { size: ${paperMm}mm ${pageHeightMm}mm; margin: ${THERMAL_INVOICE_HTML_PAGE_MARGIN_MM}mm; }`
      : `@page { size: ${paperMm}mm ${LABEL_THERMAL_PAGE_HEIGHT_MM}mm; margin: 0; }`;
    return `<!DOCTYPE html><html class="thermal-print" lang="vi"><head><meta charset="utf-8"/>
${viewportTag}<base href="${origin}/"/>
<style>
  ${pageCss}
  ${htmlBodyCss}
  ${rootBox}
  ${chromeParity}
  ${invoiceMonoCss}
</style>
<style type="text/css" data-thermal-inlined="1">
${inlinedCss}
</style>${tailStyle}</head><body><div id="print-root">${wrapper.outerHTML}</div></body></html>`;
  };

  /**
   * Hóa đơn: đo chiều cao thật rồi đặt @page bằng đúng nội dung — đơn thường in 1 phiếu liền.
   * Nếu vượt ngưỡng an toàn (`invoiceThermalMaxPageHeightMm`), giữ @page = ngưỡng để Chromium
   * tự chia trang (CSS `break-inside: avoid` giữ nguyên từng dòng món) → không mất tổng tiền.
   * Khi không đo được (SSR / lỗi), quay về số cố định cũ.
   */
  if (isInvoice && layoutWpx != null) {
    const measuredMm = await measureThermalContentHeightMm(
      buildDoc(THERMAL_INVOICE_HTML_PAGE_HEIGHT_MM),
      layoutWpx,
    );
    if (measuredMm != null) {
      const wantedMm = Math.ceil(
        measuredMm +
          2 * THERMAL_INVOICE_HTML_PAGE_MARGIN_MM +
          THERMAL_INVOICE_PAGE_HEIGHT_SLACK_MM,
      );
      const pageHeightMm = Math.max(
        THERMAL_INVOICE_MIN_PAGE_HEIGHT_MM,
        Math.min(invoiceThermalMaxPageHeightMm(), wantedMm),
      );
      return buildDoc(pageHeightMm);
    }
  }

  return buildDoc(
    isInvoice ? THERMAL_INVOICE_HTML_PAGE_HEIGHT_MM : LABEL_THERMAL_PAGE_HEIGHT_MM,
  );
}
