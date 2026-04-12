import { thermalPrinterForTarget } from "@/lib/print/shopPrinterCache";
import type { PrintTarget } from "@/lib/printTargets";

export interface SilentPrintAgentRequestOptions {
  readonly target: PrintTarget;
  readonly printerName?: string;
}

/**
 * Gửi HTML đã gộp tới agent in cục bộ (127.0.0.1) — in im lặng qua driver Windows,
 * không hộp thoại trình duyệt. Cần chạy `tools/silent-print-agent` trên máy quầy.
 */
export async function trySilentPrintAgent(
  html: string,
  options: SilentPrintAgentRequestOptions,
): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_PRINT_AGENT_URL?.trim();
  if (!base) return false;

  const printer =
    options.printerName?.trim() ||
    thermalPrinterForTarget(options.target).trim() ||
    undefined;

  const url = `${base.replace(/\/$/, "")}/print`;
  const ac = new AbortController();
  const timer = globalThis.setTimeout(() => ac.abort(), 120_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, printer }),
      signal: ac.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => res.statusText);
      throw new Error(t || `HTTP ${res.status}`);
    }
    return true;
  } catch (e) {
    console.warn("[silent-print-agent]", e);
    return false;
  } finally {
    globalThis.clearTimeout(timer);
  }
}
