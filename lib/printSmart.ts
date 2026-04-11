import type { PrintTarget } from "@/lib/printTargets";
import { isQzPrintEnabled } from "@/lib/qz/env";
import { printElementWithQz } from "@/lib/qz/printHtml";

export interface SmartPrintResult {
  readonly method: "qz" | "browser";
  readonly error?: string;
}

/**
 * In thông minh: dùng QZ Tray (gửi thẳng tới máy in theo tên) khi enabled,
 * rơi về window.print() khi không có QZ.
 */
export async function printElementSmart(
  el: HTMLElement,
  target: PrintTarget,
): Promise<SmartPrintResult> {
  if (!isQzPrintEnabled()) {
    globalThis.print();
    return { method: "browser" };
  }

  try {
    await printElementWithQz(el, { target });
    return { method: "qz" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[printSmart] QZ failed, falling back to browser print:", msg);
    globalThis.print();
    return { method: "browser", error: msg };
  }
}

/**
 * Tìm vùng in (.invoice-print-area hoặc .item-labels-print) trong DOM và in qua QZ.
 * Khi có nhiều vùng in (batch), gửi từng job lần lượt.
 */
export async function printTargetElementSmart(
  target: PrintTarget,
  container?: HTMLElement | Document,
): Promise<SmartPrintResult> {
  const root = container ?? document;

  const selector =
    target === "xp235b" ? ".item-labels-print" : ".invoice-print-area";
  const els = root.querySelectorAll(selector);

  const visible = [...els].filter((e) => {
    if (!(e instanceof HTMLElement)) return false;
    const rect = e.getBoundingClientRect();
    return rect.width >= 1 && rect.height >= 1;
  }) as HTMLElement[];

  if (visible.length === 0) {
    globalThis.print();
    return { method: "browser", error: `Không tìm thấy ${selector}` };
  }

  if (!isQzPrintEnabled()) {
    globalThis.print();
    return { method: "browser" };
  }

  try {
    for (const el of visible) {
      await printElementWithQz(el, { target });
    }
    return { method: "qz" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[printSmart] QZ batch failed, falling back:", msg);
    globalThis.print();
    return { method: "browser", error: msg };
  }
}
