import {
  PRINT_TARGET_INVOICE_XP80C,
  PRINT_TARGET_LABEL_XP235B,
  type PrintTarget,
} from "@/lib/printTargets";

export function isQzPrintEnabled(): boolean {
  return process.env.NEXT_PUBLIC_QZ_ENABLED === "1";
}

export function qzPrinterForTarget(target: PrintTarget): string {
  if (target === PRINT_TARGET_LABEL_XP235B) {
    return (
      process.env.NEXT_PUBLIC_QZ_PRINTER_LABEL?.trim() ||
      process.env.NEXT_PUBLIC_QZ_PRINTER_XP235B?.trim() ||
      ""
    );
  }
  return (
    process.env.NEXT_PUBLIC_QZ_PRINTER_INVOICE?.trim() ||
    process.env.NEXT_PUBLIC_QZ_PRINTER_XP80C?.trim() ||
    ""
  );
}
