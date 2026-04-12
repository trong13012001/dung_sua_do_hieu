"use client";

import { useState, type ReactNode } from "react";
import type { PrintTarget } from "@/lib/printTargets";
import { isSilentThermalConfigured } from "@/lib/print/thermalPrint";
import { printThermalElement } from "@/lib/print/thermalPrint";

export interface SmartPrintButtonProps {
  readonly target: PrintTarget;
  readonly children: ReactNode;
  /** Nhãn khi đã cấu hình in im lặng (Electron / agent). */
  readonly silentLabel?: ReactNode;
  readonly className?: string;
}

/**
 * Nút in thông minh:
 * - Electron / agent cấu hình → in im lặng (không dialog)
 * - Ngược lại → hộp thoại in Chrome (HTML đã gộp)
 */
export function SmartPrintButton({
  target,
  children,
  silentLabel,
  className,
}: Readonly<SmartPrintButtonProps>) {
  const [busy, setBusy] = useState(false);
  const silentReady = isSilentThermalConfigured();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const root = e.currentTarget.closest(
      ".invoice-print-area, .item-labels-print",
    );
    if (!(root instanceof HTMLElement)) {
      globalThis.alert("Không tìm thấy vùng in.");
      return;
    }

    setBusy(true);
    try {
      await printThermalElement(root, { target });
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
      {busy ? "Đang in…" : (silentReady && silentLabel) || children}
    </button>
  );
}
