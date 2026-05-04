"use client";

import React from "react";
import { OrderBarcode } from "@/components/ui/OrderBarcode";
import { encodeItemBarcodeFromOrder } from "@/lib/barcode";
import { SmartPrintButton } from "@/components/print/SmartPrintButton";
import { PRINT_TARGET_LABEL_XP235B } from "@/lib/printTargets";

export interface ItemLabelData {
    readonly name: string;
    readonly description?: string;
}

export interface ItemLabelsPrintProps {
    readonly orderId: number;
    readonly transactionCode?: string | null;
    readonly items: readonly ItemLabelData[];
    /** STT dòng (1-based) trong đơn — chỉ in các món này; bỏ qua = in toàn bộ theo thứ tự items. */
    readonly lineIndices1Based?: readonly number[];
    readonly onClose?: () => void;
    readonly customerName?: string | null;
    readonly customerAddress?: string | null;
    readonly returnTime?: string | null;
}

function rowTextLikeWpf(item: ItemLabelData): string {
    const parts = [item.name?.trim(), item.description?.trim()].filter(
        (s): s is string => Boolean(s),
    );
    return parts.join(" ");
}

function normalizeLabelText(raw: string | null | undefined): string {
    return raw?.trim().replace(/\s+/g, " ") ?? "";
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

function resolveLabelEntries(
    items: readonly ItemLabelData[],
    lineIndices1Based: readonly number[] | undefined,
): { item: ItemLabelData; lineIndex: number }[] {
    if (lineIndices1Based?.length) {
        const out: { item: ItemLabelData; lineIndex: number }[] = [];
        for (const li of lineIndices1Based) {
            const idx = li - 1;
            if (idx >= 0 && idx < items.length) {
                out.push({ item: items[idx]!, lineIndex: li });
            }
        }
        return out;
    }
    return items.map((item, i) => ({ item, lineIndex: i + 1 }));
}

export function ItemLabelsPrint({
    orderId,
    transactionCode,
    items,
    lineIndices1Based,
    onClose,
    customerName,
    customerAddress,
    returnTime,
}: Readonly<ItemLabelsPrintProps>) {
    if (!orderId || items.length === 0) return null;

    const entries = resolveLabelEntries(items, lineIndices1Based);
    if (entries.length === 0) return null;

    const returnDateLine = formatReturnDateVi(returnTime);
    const returnClockLine = formatReturnClockVi(returnTime);
    const singleLine = entries.length === 1;

    return (
        <div
            data-print-target={PRINT_TARGET_LABEL_XP235B}
            className="invoice-print-area item-labels-print bg-white text-black p-4 md:p-5 mx-auto rounded-lg print:p-0 print:max-w-none print:border-0 print:rounded-none"
        >
            <div className="non-print flex flex-wrap justify-between items-center gap-2 mb-4 shrink-0">
                <h3 className="text-sm md:text-base font-bold text-foreground">
                    {singleLine
                        ? "Tem barcode 1 món · Đơn #"
                        : "Tem barcode từng món · Đơn #"}
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

            <div className="item-labels-print-body space-y-4 md:space-y-5">
                {entries.map(({ item, lineIndex }) => {
                    const code = encodeItemBarcodeFromOrder(
                        { id: orderId, transaction_code: transactionCode },
                        lineIndex,
                    );
                    const itemText = normalizeLabelText(rowTextLikeWpf(item));
                    const customerLine = normalizeLabelText(customerName);
                    const addressLine = normalizeLabelText(customerAddress);
                    const returnLines: string[] = [];
                    if (returnDateLine?.trim()) {
                        returnLines.push(returnDateLine.trim());
                    }
                    if (returnClockLine?.trim()) {
                        returnLines.push(returnClockLine.trim());
                    }
                    const hasCustomerMetaCol =
                        addressLine.length > 0 || returnLines.length > 0;
                    return (
                        <div
                            key={`${lineIndex}-${item.name}`}
                            data-print-target={PRINT_TARGET_LABEL_XP235B}
                            className="item-labels-print item-label-print-item-scope rounded-lg border border-border/80 bg-muted/[0.06] p-2 md:p-3 print:border-0 print:bg-transparent print:p-0 print:shadow-none"
                        >
                            {entries.length > 1 ? (
                                <div className="non-print flex flex-wrap justify-end gap-2 pb-2 mb-1 border-b border-border/60">
                                    <SmartPrintButton
                                        target={PRINT_TARGET_LABEL_XP235B}
                                        className="px-2.5 py-1 bg-info/90 text-white rounded-md font-bold text-[11px] md:text-xs hover:opacity-90"
                                        silentLabel="In tem này ⚡"
                                    >
                                        In tem này
                                    </SmartPrintButton>
                                </div>
                            ) : null}
                            <div className="item-label-page">
                                <div className="item-label-row border-b border-dashed border-gray-300 last:border-b-0 print:border-b-0 ">
                                    <div
                                        className={`item-label-header-row${hasCustomerMetaCol ? "" : " item-label-header-row--solo"}`}
                                    >
                                        <div className="item-label-left-block">
                                            <div className="item-label-barcode-block">
                                                <OrderBarcode
                                                    value={code}
                                                    itemLabel
                                                />
                                            </div>
                                        </div>
                                        {hasCustomerMetaCol && (
                                            <div className="item-label-customer-block">
                                                {customerLine && (
                                                    <p className="item-label-customer-name-line">
                                                        {customerLine}
                                                    </p>
                                                )}
                                                {addressLine && (
                                                    <p className="item-label-customer-line">
                                                        {addressLine}
                                                    </p>
                                                )}
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
                                    <div className="item-label-desc-block">
                                        <p className="item-label-desc-line">
                                            {itemText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
