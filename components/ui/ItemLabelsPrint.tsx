"use client";

import React from "react";
import { OrderBarcode } from "@/components/ui/OrderBarcode";
import { encodeItemBarcodeFromOrder } from "@/lib/barcode";
import { SmartPrintButton } from "@/components/print/SmartPrintButton";
import { BrowserHtmlPrintButton } from "@/components/print/BrowserHtmlPrintButton";
import { PRINT_TARGET_LABEL_XP235B } from "@/lib/printTargets";

export interface ItemLabelData {
    readonly name: string;
    readonly description?: string;
}

/** Giống pd_PrintPage2: `newLine.Length > 20` */
const ITEM_LABEL_WRAP_CHARS = 20;
const ITEM_LABEL_HEADER_INFO_WRAP_CHARS = 14;

export interface ItemLabelsPrintProps {
    readonly orderId: number;
    readonly transactionCode?: string | null;
    readonly items: readonly ItemLabelData[];
    readonly onClose?: () => void;
    readonly customerName?: string | null;
    readonly customerAddress?: string | null;
    readonly returnTime?: string | null;
}

function splitLongToken(token: string, maxLen: number): string[] {
    if (token.length <= maxLen) return [token];
    const chunks: string[] = [];
    for (let i = 0; i < token.length; i += maxLen) {
        chunks.push(token.slice(i, i + maxLen));
    }
    return chunks;
}

function wrapItemLabelText(
    raw: string,
    maxLen: number,
): string[] {
    const noiDung = raw
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .flatMap((token) => splitLongToken(token, maxLen));
    if (noiDung.length === 0) return [];
    const lines: string[] = [];
    let newLine = "";
    for (let j = 0; j < noiDung.length; j++) {
        newLine += `${noiDung[j]} `;
        if (newLine.length > maxLen || j === noiDung.length - 1) {
            lines.push(newLine.trimEnd());
            newLine = "";
        }
    }
    return lines;
}

function rowTextLikeWpf(item: ItemLabelData): string {
    const parts = [item.name?.trim(), item.description?.trim()].filter(
        (s): s is string => Boolean(s),
    );
    return parts.join(" ");
}

/** Ngày trả — dòng riêng như tem mẫu (05/03/2026) */
function formatReturnDateVi(iso: string | null | undefined): string | null {
    if (!iso?.trim()) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

/** Giờ trả — dòng riêng (16:00:00) */
function formatReturnClockVi(iso: string | null | undefined): string | null {
    if (!iso?.trim()) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

export function ItemLabelsPrint({
    orderId,
    transactionCode,
    items,
    onClose,
    customerName,
    customerAddress,
    returnTime,
}: Readonly<ItemLabelsPrintProps>) {
    if (!orderId || items.length === 0) return null;

    const returnDateLine = formatReturnDateVi(returnTime);
    const returnClockLine = formatReturnClockVi(returnTime);

    return (
        <div
            data-print-target={PRINT_TARGET_LABEL_XP235B}
            className="invoice-print-area item-labels-print bg-white text-black p-4 md:p-5 mx-auto rounded-lg print:p-0 print:max-w-none print:border-0 print:rounded-none"
        >
            <div className="non-print flex flex-wrap justify-between items-center gap-2 mb-4 shrink-0">
                <h3 className="text-sm md:text-base font-bold text-foreground">
                    Tem barcode từng món · Đơn #
                    {orderId.toString().padStart(5, "0")}
                </h3>
                <div className="flex gap-2">
                    <SmartPrintButton
                        target={PRINT_TARGET_LABEL_XP235B}
                        className="px-3 py-1.5 bg-primary text-white rounded-md font-bold text-xs md:text-sm hover:opacity-90"
                        silentLabel="In tem XP-235B ⚡"
                    >
                        In tem
                    </SmartPrintButton>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 border border-border rounded-md font-bold text-xs md:text-sm hover:bg-muted/50"
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>

            <div className="item-labels-print-body">
                {items.map((item, index) => {
                    /* STT món giống C#: a = i + 1 → món đầu …01 */
                    const lineIndex = index + 1;
                    const code = encodeItemBarcodeFromOrder(
                        { id: orderId, transaction_code: transactionCode },
                        lineIndex,
                    );
                    const lines = wrapItemLabelText(
                        rowTextLikeWpf(item),
                        ITEM_LABEL_WRAP_CHARS,
                    );
                    const customerLines = customerName?.trim()
                        ? wrapItemLabelText(
                              `${customerName.trim()}`,
                              ITEM_LABEL_HEADER_INFO_WRAP_CHARS,
                          )
                        : [];
                    const addressLines = customerAddress?.trim()
                        ? wrapItemLabelText(
                              `${customerAddress.trim()}`,
                              ITEM_LABEL_HEADER_INFO_WRAP_CHARS,
                          )
                        : [];
                    const returnLines: string[] = [];
                    if (returnDateLine?.trim()) {
                        returnLines.push(
                            ...wrapItemLabelText(
                                returnDateLine.trim(),
                                ITEM_LABEL_HEADER_INFO_WRAP_CHARS,
                            ),
                        );
                    }
                    if (returnClockLine?.trim()) {
                        returnLines.push(
                            ...wrapItemLabelText(
                                returnClockLine.trim(),
                                ITEM_LABEL_HEADER_INFO_WRAP_CHARS,
                            ),
                        );
                    }
                    const hasCustomerCol =
                        customerLines.length > 0 ||
                        addressLines.length > 0 ||
                        returnLines.length > 0;
                    return (
                        <div key={`${index}-${item.name}`} className="item-label-page">
                            <div className="item-label-row border-b border-dashed border-gray-300 last:border-b-0 print:border-b-0 ">
                                <div
                                    className={`item-label-header-row${hasCustomerCol ? "" : " item-label-header-row--solo"}`}
                                >
                                    <div className="item-label-left-block">
                                        <div className="item-label-barcode-block">
                                            <OrderBarcode value={code} itemLabel />
                                        </div>
                                        <div className="item-label-desc-block">
                                            {lines.map((line, li) => (
                                                <p
                                                    key={`${code}-L${li}`}
                                                    className="item-label-desc-line"
                                                >
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    {hasCustomerCol && (
                                        <div className="item-label-customer-block">
                                            {customerLines.map((line, li) => (
                                                <p
                                                    key={`${code}-kh-${li}`}
                                                    className="item-label-customer-line"
                                                >
                                                    {line}
                                                </p>
                                            ))}
                                            {addressLines.map((line, li) => (
                                                <p
                                                    key={`${code}-dc-${li}`}
                                                    className="item-label-customer-line"
                                                >
                                                    {line}
                                                </p>
                                            ))}
                                            {returnLines.map((line, li) => (
                                                <p
                                                    key={`${code}-tr-${li}`}
                                                    className="item-label-customer-line"
                                                >
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
