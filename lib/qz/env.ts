import {
  PRINT_TARGET_INVOICE_XP80C,
  PRINT_TARGET_LABEL_XP235B,
  type PrintTarget,
} from "@/lib/printTargets";

/**
 * Module-level cache populated by ShopSettingsSync from React tree.
 * Falls back to NEXT_PUBLIC_* env vars when cache is empty.
 */
let cachedQzEnabled: string | undefined;
let cachedPrinterInvoice: string | undefined;
let cachedPrinterLabel: string | undefined;

export function syncQzSettings(settings: {
  qz_enabled?: string;
  qz_printer_invoice?: string;
  qz_printer_label?: string;
}): void {
  cachedQzEnabled = settings.qz_enabled;
  cachedPrinterInvoice = settings.qz_printer_invoice;
  cachedPrinterLabel = settings.qz_printer_label;
}

export function isQzPrintEnabled(): boolean {
  const val = cachedQzEnabled ?? process.env.NEXT_PUBLIC_QZ_ENABLED;
  return val === "1";
}

export function qzPrinterForTarget(target: PrintTarget): string {
  if (target === PRINT_TARGET_LABEL_XP235B) {
    return (
      cachedPrinterLabel?.trim() ||
      process.env.NEXT_PUBLIC_QZ_PRINTER_LABEL?.trim() ||
      process.env.NEXT_PUBLIC_QZ_PRINTER_XP235B?.trim() ||
      ""
    );
  }
  return (
    cachedPrinterInvoice?.trim() ||
    process.env.NEXT_PUBLIC_QZ_PRINTER_INVOICE?.trim() ||
    process.env.NEXT_PUBLIC_QZ_PRINTER_XP80C?.trim() ||
    ""
  );
}
