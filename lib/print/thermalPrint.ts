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

export interface ThermalPrintOptions {
  readonly target: PrintTarget;
  readonly printerName?: string;
  readonly paperWidthMm?: number;
}

function defaultPaperWidthMm(target: PrintTarget): number {
  if (target === PRINT_TARGET_LABEL_XP235B) return 58;
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
    await new Promise<void>((resolve) => {
      const maxWait = globalThis.setTimeout(() => {
        w.removeEventListener("afterprint", onAfter);
        resolve();
      }, 300_000);
      const onAfter = () => {
        globalThis.clearTimeout(maxWait);
        w.removeEventListener("afterprint", onAfter);
        resolve();
      };
      w.addEventListener("afterprint", onAfter);
      w.print();
    });
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

/**
 * In nhiệt: **Electron silent** → agent localhost (tuỳ chọn) → hộp thoại Chrome (tuỳ chọn env) → **luôn** fallback dialog HTML.
 * Electron silent → agent (tuỳ chọn) → dialog.
 */
export async function printThermalElement(
  sourceEl: HTMLElement,
  options: ThermalPrintOptions,
): Promise<ThermalPrintMethod> {
  const widthMm = options.paperWidthMm ?? defaultPaperWidthMm(options.target);
  const isInvoice = options.target === PRINT_TARGET_INVOICE_XP80C;

  const html = await buildPrintableHtmlFromElement(sourceEl, {
    paperWidthMm: widthMm,
  });

  const deviceName =
    options.printerName?.trim() || thermalPrinterForTarget(options.target);

  if (await tryElectronSilentPrint(html, deviceName)) {
    return "silent";
  }

  if (await trySilentPrintAgent(html, options)) {
    return "silent";
  }

  if (isInvoice && isInvoiceBrowserPrintEnabled()) {
    await printHtmlThroughBrowserDialog(html);
    return "browser";
  }

  await printHtmlThroughBrowserDialog(html);
  return "browser";
}
