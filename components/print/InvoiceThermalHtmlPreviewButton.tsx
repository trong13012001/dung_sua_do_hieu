"use client";

import { useState, type MouseEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { buildPrintableHtmlFromElement } from "@/lib/print/buildPrintHtml";

function paper80mmToCssPx(): number {
  return Math.round((80 / 25.4) * 96);
}

export interface InvoiceThermalHtmlPreviewButtonProps {
  readonly className?: string;
}

/**
 * Hiển thị trong iframe cùng HTML/CSS dùng khi in (Electron / agent / Chrome).
 */
export function InvoiceThermalHtmlPreviewButton({
  className,
}: Readonly<InvoiceThermalHtmlPreviewButtonProps>) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setHtml(null);
    setError(null);
  };

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    const root = e.currentTarget.closest(".invoice-print-area");
    if (!(root instanceof HTMLElement)) {
      globalThis.alert("Không tìm thấy vùng in (.invoice-print-area).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const doc = await buildPrintableHtmlFromElement(root, {
        paperWidthMm: 80,
      });
      setHtml(doc);
      setOpen(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const wPx = paper80mmToCssPx();

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={handleClick}
      >
        {busy ? "Đang tạo…" : "Xem trước HTML in"}
      </button>
      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Xem trước HTML in nhiệt"
        maxWidth="max-w-4xl"
      >
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {html ? (
          <div className="flex flex-col items-center gap-2">
            <div className="max-h-[min(78vh,820px)] w-full overflow-auto rounded-md border border-border bg-neutral-200 p-3 dark:bg-neutral-900">
              <iframe
                title="Bản xem trước HTML in nhiệt"
                srcDoc={html}
                className="mx-auto block border border-neutral-400 bg-white shadow-sm"
                style={{
                  width: `${wPx}px`,
                  minHeight: "420px",
                  height: "min(72vh, 760px)",
                }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Cùng nội dung và CSS đã gộp như lệnh in thực tế; từng engine (Chrome / Electron)
              có thể lệch vài pixel.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
