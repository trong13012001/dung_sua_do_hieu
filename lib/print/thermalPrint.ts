import {
  PRINT_TARGET_INVOICE_XP80C,
  PRINT_TARGET_LABEL_XP235B,
  type PrintTarget,
} from "@/lib/printTargets";
import { buildPrintableHtmlFromElement } from "@/lib/print/buildPrintHtml";
import { thermalPrinterForTarget } from "@/lib/print/shopPrinterCache";
import { trySilentPrintAgent } from "@/lib/print/printAgentClient";
import {
  isElectronThermalPrintAvailable,
  tryElectronSilentPrint,
} from "@/lib/print/electronPrintClient";
import { LABEL_THERMAL_PAPER_WIDTH_MM } from "@/lib/print/labelThermalMetrics";

export interface ThermalPrintOptions {
  readonly target: PrintTarget;
  readonly printerName?: string;
  readonly paperWidthMm?: number;
}

function defaultPaperWidthMm(target: PrintTarget): number {
  if (target === PRINT_TARGET_LABEL_XP235B) return LABEL_THERMAL_PAPER_WIDTH_MM;
  if (target === PRINT_TARGET_INVOICE_XP80C) return 80;
  return 80;
}

/** Electron silent hoặc agent localhost — in tự động không dialog (khi agent/Electron chạy). */
export function isSilentThermalConfigured(): boolean {
  if (
    typeof globalThis !== "undefined" &&
    isElectronThermalPrintAvailable()
  ) {
    return true;
  }
  return Boolean(process.env.NEXT_PUBLIC_PRINT_AGENT_URL?.trim());
}

function isInvoiceBrowserPrintEnabled(): boolean {
  return process.env.NEXT_PUBLIC_THERMAL_INVOICE_BROWSER_PRINT === "1";
}

async function printHtmlThroughBrowserDialog(html: string): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "thermal-browser-print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const t = globalThis.setTimeout(() => {
        reject(new Error("Timeout tải iframe in."));
      }, 25_000);
      iframe.onload = () => {
        globalThis.clearTimeout(t);
        resolve();
      };
      iframe.srcdoc = html;
    });

    const w = iframe.contentWindow;
    if (!w) {
      throw new Error("Không có cửa sổ iframe.");
    }
    w.focus();
    /**
     * Không dùng `afterprint` trên iframe: Electron/Chromium hay báo
     * "The provided callback is no longer runnable" khi dialog đóng / node bị gỡ.
     * `print()` trên cửa sổ iframe thường **chặn** tới khi hộp thoại in đóng (giống tab).
     */
    try {
      w.print();
    } catch (err) {
      console.warn("[thermalPrint] iframe.print():", err);
    }
  } finally {
    globalThis.setTimeout(() => iframe.remove(), 120_000);
  }
}

/**
 * Gộp HTML (giống preview) rồi `window.print()` trong iframe — có hộp thoại Chrome.
 */
export async function printElementHtmlThroughBrowser(
  sourceEl: HTMLElement,
  options: ThermalPrintOptions,
): Promise<void> {
  const widthMm = options.paperWidthMm ?? defaultPaperWidthMm(options.target);
  const html = await buildPrintableHtmlFromElement(sourceEl, {
    paperWidthMm: widthMm,
  });
  await printHtmlThroughBrowserDialog(html);
}

export type ThermalPrintMethod = "silent" | "browser";
export type ThermalPrintChannel = "electron" | "agent" | "browser" | "mixed";

export interface ThermalPrintDispatchResult {
  readonly method: ThermalPrintMethod;
  /** Kênh đã nhận lệnh in (xác nhận mức app/spooler callback). */
  readonly channel: ThermalPrintChannel;
  /** Có xác nhận gửi job từ kênh in hay chưa. */
  readonly dispatched: boolean;
}

async function dispatchThermalHtml(
  html: string,
  options: ThermalPrintOptions,
): Promise<ThermalPrintDispatchResult> {
  const isInvoice = options.target === PRINT_TARGET_INVOICE_XP80C;
  const deviceName =
    options.printerName?.trim() || thermalPrinterForTarget(options.target);

  const electron = await tryElectronSilentPrint(html, deviceName);
  if (electron.ok) {
    return { method: "silent", channel: "electron", dispatched: true };
  }
  if (electron.reason === "failed" && isElectronThermalPrintAvailable()) {
    throw new Error(
      `${electron.message} — Kiểm tra tên máy in (Cài đặt shop) trùng Windows hoặc driver máy in.`,
    );
  }

  if (await trySilentPrintAgent(html, options)) {
    return { method: "silent", channel: "agent", dispatched: true };
  }

  if (isInvoice && isInvoiceBrowserPrintEnabled()) {
    await printHtmlThroughBrowserDialog(html);
    return { method: "browser", channel: "browser", dispatched: true };
  }

  await printHtmlThroughBrowserDialog(html);
  return { method: "browser", channel: "browser", dispatched: true };
}

function collectItemLabelRows(sourceEl: HTMLElement): HTMLElement[] {
  if (sourceEl.classList.contains("item-label-row")) {
    return [sourceEl];
  }
  const rows = [...sourceEl.querySelectorAll(".item-label-row")].filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  if (rows.length > 0) return rows;
  return [sourceEl];
}

function createSingleLabelHost(row: HTMLElement): HTMLElement {
  const host = document.createElement("div");
  host.className = "item-labels-print";
  host.setAttribute("data-print-target", PRINT_TARGET_LABEL_XP235B);
  const body = document.createElement("div");
  body.className = "item-labels-print-body";
  const page = document.createElement("div");
  page.className = "item-label-page";
  page.appendChild(row.cloneNode(true));
  body.appendChild(page);
  host.appendChild(body);
  return host;
}

/**
 * In nhiệt: **Electron silent** → agent localhost (tuỳ chọn) → hộp thoại Chrome (tuỳ chọn env) → **luôn** fallback dialog HTML.
 * Electron silent → agent (tuỳ chọn) → dialog.
 */
export async function printThermalElementWithStatus(
  sourceEl: HTMLElement,
  options: ThermalPrintOptions,
): Promise<ThermalPrintDispatchResult> {
  const widthMm = options.paperWidthMm ?? defaultPaperWidthMm(options.target);
  if (options.target === PRINT_TARGET_LABEL_XP235B) {
    const rows = collectItemLabelRows(sourceEl);
    let method: ThermalPrintMethod = "silent";
    const channels = new Set<ThermalPrintChannel>();

    for (let i = 0; i < rows.length; i += 1) {
      const host = createSingleLabelHost(rows[i]);
      const html = await buildPrintableHtmlFromElement(host, {
        paperWidthMm: widthMm,
      });
      let one: ThermalPrintDispatchResult;
      try {
        one = await dispatchThermalHtml(html, options);
      } catch (err) {
        throw new Error(
          `Tem ${i + 1}/${rows.length}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      channels.add(one.channel);
      if (one.method === "browser") {
        method = "browser";
      }
      if (i < rows.length - 1) {
        await new Promise((resolve) => globalThis.setTimeout(resolve, 120));
      }
    }

    const channel =
      channels.size === 1
        ? [...channels][0]
        : (channels.has("browser") ? "browser" : "mixed");

    return { method, channel, dispatched: true };
  }

  const html = await buildPrintableHtmlFromElement(sourceEl, {
    paperWidthMm: widthMm,
  });
  return dispatchThermalHtml(html, options);
}

export async function printThermalElement(
  sourceEl: HTMLElement,
  options: ThermalPrintOptions,
): Promise<ThermalPrintMethod> {
  const result = await printThermalElementWithStatus(sourceEl, options);
  return result.method;
}
