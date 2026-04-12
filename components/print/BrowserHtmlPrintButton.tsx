"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { PrintTarget } from "@/lib/printTargets";
import { printElementHtmlThroughBrowser } from "@/lib/print/thermalPrint";

export interface BrowserHtmlPrintButtonProps {
    readonly target: PrintTarget;
    readonly children: ReactNode;
    readonly className?: string;
}

/**
 * In cùng HTML đã gộp như luồng in nhiệt nhưng qua **hộp thoại Chrome → driver Windows**.
 */
export function BrowserHtmlPrintButton({
    target,
    children,
    className,
}: Readonly<BrowserHtmlPrintButtonProps>) {
    const [busy, setBusy] = useState(false);
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
        const root = e.currentTarget.closest(
            ".invoice-print-area, .item-labels-print",
        );
        if (!(root instanceof HTMLElement)) {
            globalThis.alert("Không tìm thấy vùng in.");
            return;
        }
        setBusy(true);
        try {
            await printElementHtmlThroughBrowser(root, { target });
        } catch (err) {
            console.error(err);
            globalThis.alert(
                err instanceof Error ? err.message : String(err),
            );
        } finally {
            if (alive.current) setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className={className}
            disabled={busy}
            onClick={handleClick}
        >
            {busy ? "Đang mở in…" : children}
        </button>
    );
}
