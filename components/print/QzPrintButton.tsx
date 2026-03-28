"use client";

import type { ReactNode } from "react";
import { isQzPrintEnabled } from "@/lib/qz/env";
import { printElementWithQz } from "@/lib/qz/printHtml";
import type { PrintTarget } from "@/lib/printTargets";

export interface QzPrintButtonProps {
  readonly target: PrintTarget;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * In qua QZ Tray (pixel HTML). Chỉ hiện khi NEXT_PUBLIC_QZ_ENABLED=1.
 * Vùng in: ancestor `.invoice-print-area` gần nút nhất.
 */
export function QzPrintButton({
  target,
  children,
  className,
}: Readonly<QzPrintButtonProps>) {
  if (!isQzPrintEnabled()) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={async (e) => {
        const root = e.currentTarget.closest(".invoice-print-area");
        if (!(root instanceof HTMLElement)) {
          globalThis.alert("Không tìm thấy vùng in (.invoice-print-area).");
          return;
        }
        try {
          await printElementWithQz(root, { target });
        } catch (err) {
          console.error(err);
          globalThis.alert(
            err instanceof Error ? err.message : String(err),
          );
        }
      }}
    >
      {children}
    </button>
  );
}
