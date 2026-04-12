import type { PrintTarget } from "@/lib/printTargets";
import {
  PRINT_TARGET_INVOICE_XP80C,
  PRINT_TARGET_LABEL_XP235B,
} from "@/lib/printTargets";
import {
  printThermalElement,
  type ThermalPrintMethod,
} from "@/lib/print/thermalPrint";

const THERMAL_MERGED_INVOICE_HOST_CLASS = "thermal-merged-invoice-host";

function mmToCssPx(mm: number): number {
  return Math.round((mm / 25.4) * 96);
}

/**
 * Nhiều `.invoice-print-area` trên document: ưu tiên nhóm trong cùng một `[role="dialog"]`
 * (một modal = một lô hoặc một phiếu). Tránh in trùng khi POS vừa có preview vừa có modal.
 */
function pickInvoiceAreasForThermalJob(visible: HTMLElement[]): HTMLElement[] {
  if (visible.length <= 1) return [...visible];

  const byDialog = new Map<Element, HTMLElement[]>();
  for (const el of visible) {
    const d = el.closest('[role="dialog"]');
    if (!d) continue;
    const arr = byDialog.get(d) ?? [];
    arr.push(el);
    byDialog.set(d, arr);
  }

  if (byDialog.size > 0) {
    let best: HTMLElement[] = [];
    for (const group of byDialog.values()) {
      if (group.length > best.length) best = group;
    }
    return best;
  }

  const last = visible.at(-1);
  return last ? [last] : [];
}

/** Gộp nhiều phiếu rồi một lệnh in (Electron / agent / dialog). */
async function printInvoiceAreasMergedReturn(
  areas: HTMLElement[],
): Promise<ThermalPrintMethod> {
  if (areas.length === 0) return "browser";
  if (areas.length === 1) {
    return printThermalElement(areas[0], {
      target: PRINT_TARGET_INVOICE_XP80C,
    });
  }

  const wpx = mmToCssPx(80);
  const host = document.createElement("div");
  host.className = THERMAL_MERGED_INVOICE_HOST_CLASS;
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-9999px",
    "top:0",
    `width:${wpx}px`,
    "box-sizing:border-box",
    "background:#fff",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");

  for (const el of areas) {
    host.appendChild(el.cloneNode(true) as HTMLElement);
  }
  document.body.appendChild(host);
  try {
    return await printThermalElement(host, { target: PRINT_TARGET_INVOICE_XP80C });
  } finally {
    host.remove();
  }
}

export interface SmartPrintResult {
  /** `silent`: Electron hoặc agent localhost không dialog; `browser`: hộp thoại in hoặc fallback */
  readonly method: ThermalPrintMethod;
  readonly error?: string;
}

/**
 * In nhiệt: Electron / agent im lặng khi cấu hình.
 */
export async function printElementSmart(
  el: HTMLElement,
  target: PrintTarget,
): Promise<SmartPrintResult> {
  try {
    const method = await printThermalElement(el, { target });
    return { method };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[printSmart] thermal print failed, falling back:", msg);
    globalThis.print();
    return { method: "browser", error: msg };
  }
}

/**
 * Tìm vùng in (.invoice-print-area hoặc .item-labels-print) và in.
 * Hóa đơn: gộp phiếu trong cùng modal; tem: vùng hiển thị cuối.
 */
export async function printTargetElementSmart(
  target: PrintTarget,
  container?: HTMLElement | Document,
): Promise<SmartPrintResult> {
  const root = container ?? document;

  const selector =
    target === PRINT_TARGET_LABEL_XP235B
      ? ".item-labels-print"
      : ".invoice-print-area";
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

  try {
    let method: ThermalPrintMethod = "browser";
    if (target === PRINT_TARGET_LABEL_XP235B) {
      const one = visible.at(-1);
      if (one) method = await printThermalElement(one, { target });
    } else {
      const picked = pickInvoiceAreasForThermalJob(visible);
      method = await printInvoiceAreasMergedReturn(picked);
    }
    return { method };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[printSmart] batch thermal failed, falling back:", msg);
    globalThis.print();
    return { method: "browser", error: msg };
  }
}
