"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PrintTarget } from "@/lib/printTargets";
import {
  isSilentThermalConfigured,
  printThermalElementWithStatus,
} from "@/lib/print/thermalPrint";

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
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const silentReady = isSilentThermalConfigured();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const root = e.currentTarget.closest(
      ".invoice-print-area, .item-labels-print",
    );
    if (!(root instanceof HTMLElement)) {
      globalThis.alert("Không tìm thấy vùng in.");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const result = await printThermalElementWithStatus(root, { target });
      if (alive.current) {
        setFeedback({
          type: "success",
          message: result.method === "silent"
            ? `Đã xác nhận gửi lệnh in qua ${result.channel}.`
            : "Đã mở hộp thoại in. Hãy xác nhận để gửi lệnh in.",
        });
      }
    } catch (err) {
      console.error(err);
      if (alive.current) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      globalThis.alert(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={handleClick}
      >
        {busy ? "Đang in…" : (silentReady && silentLabel) || children}
      </button>
      {feedback ? (
        <span
          role="status"
          className={`text-xs ${
            feedback.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {feedback.message}
        </span>
      ) : null}
    </div>
  );
}
