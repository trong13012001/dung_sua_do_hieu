import {
  PRINT_TARGET_INVOICE_XP80C,
  PRINT_TARGET_LABEL_XP235B,
  type PrintTarget,
} from "@/lib/printTargets";

/**
 * Cache tên máy in từ DB (ShopSettingsSync). Fallback: biến môi trường `NEXT_PUBLIC_THERMAL_PRINTER_*`.
 */
let cachedPrinterInvoice: string | undefined;
let cachedPrinterLabel: string | undefined;

export function syncThermalPrintersFromShop(settings: {
  thermal_printer_invoice?: string;
  thermal_printer_label?: string;
}): void {
  cachedPrinterInvoice = settings.thermal_printer_invoice;
  cachedPrinterLabel = settings.thermal_printer_label;
}

/** Tên máy in Windows (Electron silent / agent / hộp thoại). */
export function thermalPrinterForTarget(target: PrintTarget): string {
  if (target === PRINT_TARGET_LABEL_XP235B) {
    return (
      cachedPrinterLabel?.trim() ||
      process.env.NEXT_PUBLIC_THERMAL_PRINTER_LABEL?.trim() ||
      process.env.NEXT_PUBLIC_THERMAL_PRINTER_XP235B?.trim() ||
      ""
    );
  }
  return (
    cachedPrinterInvoice?.trim() ||
    process.env.NEXT_PUBLIC_THERMAL_PRINTER_INVOICE?.trim() ||
    process.env.NEXT_PUBLIC_THERMAL_PRINTER_XP80C?.trim() ||
    ""
  );
}
