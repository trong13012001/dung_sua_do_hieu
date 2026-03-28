import {
  PRINT_TARGET_INVOICE_XP80C,
  PRINT_TARGET_LABEL_XP235B,
  type PrintTarget,
} from "@/lib/printTargets";
import { buildPrintableHtmlFromElement } from "@/lib/qz/buildPrintHtml";
import { getQzConnected } from "@/lib/qz/connect";
import { qzPrinterForTarget } from "@/lib/qz/env";

export interface QzPrintHtmlOptions {
  readonly target: PrintTarget;
  readonly printerName?: string;
  readonly paperWidthMm?: number;
}

function defaultPaperWidthMm(target: PrintTarget): number {
  if (target === PRINT_TARGET_LABEL_XP235B) return 58;
  if (target === PRINT_TARGET_INVOICE_XP80C) return 80;
  return 80;
}

export async function printElementWithQz(
  sourceEl: HTMLElement,
  options: QzPrintHtmlOptions,
): Promise<void> {
  const qz = await getQzConnected();
  let name =
    options.printerName?.trim() || qzPrinterForTarget(options.target);
  if (!name) {
    name = await qz.printers.getDefault();
  }
  if (!name) {
    throw new Error(
      "Chưa cấu hình tên máy in QZ. Đặt NEXT_PUBLIC_QZ_PRINTER_INVOICE / NEXT_PUBLIC_QZ_PRINTER_LABEL trong .env.local hoặc đặt máy in mặc định Windows.",
    );
  }

  const widthMm = options.paperWidthMm ?? defaultPaperWidthMm(options.target);
  const html = buildPrintableHtmlFromElement(sourceEl);

  const config = qz.configs.create(name, {
    units: "mm",
    size: { width: widthMm, height: 1000 },
    margins: 0,
    rasterize: false,
    scaleContent: true,
    jobName: "DungSuaDoHieu",
  });

  const data = [
    {
      type: "pixel" as const,
      format: "html" as const,
      flavor: "plain" as const,
      data: html,
    },
  ];

  await config.print(data);
}
