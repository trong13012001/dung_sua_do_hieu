"use client";

import { useState, type ReactNode } from "react";
import type { PrintTarget } from "@/lib/printTargets";
import { isQzPrintEnabled } from "@/lib/qz/env";
import { printElementWithQz } from "@/lib/qz/printHtml";

export interface SmartPrintButtonProps {
  readonly target: PrintTarget;
  readonly children: ReactNode;
  readonly qzLabel?: ReactNode;
  readonly className?: string;
}

/**
 * Nút in thông minh:
 * - QZ enabled → in trực tiếp tới máy in (không mở dialog trình duyệt)
 * - QZ không enabled → `window.print()` (mở dialog)
 */
export function SmartPrintButton({
  target,
  children,
  qzLabel,
  className,
}: Readonly<SmartPrintButtonProps>) {
  const [busy, setBusy] = useState(false);
  const qzEnabled = isQzPrintEnabled();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!qzEnabled) {
      globalThis.print();
      return;
    }

    const root = e.currentTarget.closest(
      ".invoice-print-area, .item-labels-print",
    );
    if (!(root instanceof HTMLElement)) {
      globalThis.alert("Không tìm thấy vùng in.");
      return;
    }

    setBusy(true);
    try {
      await printElementWithQz(root, { target });
    } catch (err) {
      console.error(err);
      globalThis.alert(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={handleClick}
    >
      {busy ? "Đang in…" : (qzEnabled && qzLabel) || children}
    </button>
  );
}
