"use client";

import React from "react";
import { Order, OrderDetail } from "@/lib/types";
import { OrderBarcode } from "@/components/ui/OrderBarcode";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
    invoiceBarcodeFromOrder,
    invoiceDisplayNoFromBarcodeCode,
} from "@/lib/barcode";
import { wrapDetailLines } from "@/lib/invoicePrintLayout";
import { SmartPrintButton } from "@/components/print/SmartPrintButton";
import { PRINT_TARGET_INVOICE_XP80C } from "@/lib/printTargets";
import { useShopSettings } from "@/api/shopSettings";

function formatInvoiceDetailLine(d: OrderDetail): string {
    const name = d.item_name?.trim() ?? "";
    const desc = d.description?.trim() ?? "";
    if (name && desc) return `${name}: ${desc}`;
    return name || desc || "—";
}

function collectStaffNames(details: OrderDetail[] | undefined): string {
    if (!details?.length) return "";
    const names = [
        ...new Set(
            details.map((d) => d.tailor?.name).filter(Boolean) as string[],
        ),
    ];
    return names.join(", ");
}

/** Ngày trên phiếu giống C# ngayGD: yyyy-MM-dd theo múi giờ VN. */
function formatInvoiceDateYmdVn(iso: string): string {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

export interface InvoicePrintProps {
    readonly order: Order;
    readonly onClose?: () => void;
    readonly multiPage?: boolean;
}

/** Single invoice: one page. For batch, use InvoicePrintContent + invoice-page class. */
export function InvoicePrint({
    order,
    onClose,
    multiPage,
}: Readonly<InvoicePrintProps>) {
    return (
        <div
            data-print-target={PRINT_TARGET_INVOICE_XP80C}
            className={`invoice-print-area invoice-xp80c invoice-cs-receipt bg-white text-black m-0 max-w-xl p-0 print:max-w-none ${multiPage ? "invoice-page" : "invoice-single"}`}
        >
            <div className="non-print space-y-3 mb-3 px-1 shrink-0">
                <div className="flex flex-wrap justify-end gap-2">
                    <SmartPrintButton
                        target={PRINT_TARGET_INVOICE_XP80C}
                        className="px-4 py-2 bg-primary text-white rounded-md font-bold text-sm hover:opacity-90"
                        qzLabel="In XP-80C ⚡"
                    >
                        In XP-80C (80mm)
                    </SmartPrintButton>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-border rounded-md font-bold text-sm hover:bg-muted/50"
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>
            <div className="min-w-0">
                <InvoicePrintContent order={order} />
            </div>
        </div>
    );
}

export interface InvoicePrintContentProps {
    readonly order: Order;
}

/** Nội dung hóa đơn — convert từ pd_PrintPage1 (C#). */
export function InvoicePrintContent({
    order,
}: Readonly<InvoicePrintContentProps>) {
    const { data: settings } = useShopSettings();
    const orderCode = invoiceBarcodeFromOrder(order);
    const invoiceNo = invoiceDisplayNoFromBarcodeCode(orderCode);
    const invoiceDate = formatInvoiceDateYmdVn(order.created_at);
    const staffLine = collectStaffNames(order.details);
    const details = order.details ?? [];

    return (
        <>
            <div className="m-0 p-0 print:p-0">
                <div className="invoice-xp80c-header flex flex-row items-start justify-between gap-2 sm:gap-3 mb-2">
                    <div className="shrink-0">
                        <BrandLogo
                            unoptimized
                            className="invoice-brand-mark h-[65px] w-[65px] sm:h-[65px] sm:w-[65px] object-contain object-left print:h-[17mm] print:w-[17mm] print:max-h-[17mm] print:max-w-[17mm]"
                        />
                    </div>
                    <OrderBarcode value={orderCode} />
                </div>

                <p className="text-center text-[14px] font-bold text-black leading-tight">
                    {settings?.shop_name || "DŨNG SỬA ĐỒ HIỆU"}
                </p>
                <p className="text-center text-[10px] font-bold text-black mt-1">
                    Hotline: {settings?.shop_hotline || "0904672288"}
                </p>

                <p className="text-center text-[12px]  font-bold text-black mt-3">
                    HÓA ĐƠN GIAO DỊCH
                </p>

                <div className="flex flex-row justify-between items-start gap-2  mt-2 text-black">
                    <p className="min-w-0 font-semibold text-[9px]">
                        Khách hàng: {order.customer?.name || "Vãng lai"}
                    </p>
                    <p className="shrink-0 text-right font-s whitespace-nowrap font-semibold text-[9px]">
                        No {invoiceNo} Ngày: {invoiceDate}
                    </p>
                </div>

                <div className="mt-1 space-y-0.5   text-black">
                    <p className="font-semibold text-[9px]">
                        SĐT: {order.customer?.phone || "—"}
                    </p>
                    <p className="font-semibold text-[9px]">
                        Địa chỉ: {order.customer?.address?.trim() || "—"}
                    </p>
                    <p className="font-semibold text-[9px]">
                        Nhân viên: {staffLine || "—"}
                    </p>
                    <p className="font-semibold text-[10px]">
                        Hẹn trả đồ:{" "}
                        <span className="font-bold">
                            {order.return_time
                                ? `${new Date(order.return_time).toLocaleDateString("vi-VN")} ${new Date(order.return_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                                : "—"}
                        </span>
                    </p>
                </div>

                <table className="invoice-cs-table w-full border-collapse   mt-3 text-black">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-1 pr-1 text-left w-8 font-bold align-bottom text-[10px]">
                                STT
                            </th>
                            <th className="py-1 px-1 text-left font-bold align-bottom text-[10px]">
                                Chi Tiết giao dịch
                            </th>
                            <th className="py-1 pl-1 text-right font-bold align-bottom whitespace-nowrap text-[10px]">
                                Đơn giá
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.length === 0 ? (
                            <tr className="border-b-[0.25px] border-black">
                                <td className="py-1 pr-1 text-center font-bold text-[10px]">
                                    —
                                </td>
                                <td className="py-1 px-1 font-semibold text-[10px]">
                                    —
                                </td>
                                <td className="py-1 pl-1 text-right font-semibold text-[10px]">
                                    —
                                </td>
                            </tr>
                        ) : (
                            details.map((d, idx) => (
                                <tr
                                    key={d.id}
                                    className="border-b-[0.1px] border-black align-top"
                                >
                                    <td className="py-1 pr-1 text-center font-bold text-[10px]">
                                        {idx + 1}
                                    </td>
                                    <td className="py-1 px-1  leading-snug text-[10px]">
                                        {wrapDetailLines(
                                            formatInvoiceDetailLine(d),
                                            30,
                                        ).map((line, i) => (
                                            <div
                                                key={`detail-${d.id}-line-${i}`}
                                            >
                                                {line}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="py-1 pl-1 text-right  whitespace-nowrap text-[10px]">
                                        {new Intl.NumberFormat("vi-VN").format(
                                            d.unit_price,
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <p className="text-right text-[10px]  font-bold text-black mt-2">
                    Tổng tiền:{" "}
                    {new Intl.NumberFormat("vi-VN").format(order.total_amount)}{" "}
                    VNĐ
                </p>

                <div className="mt-4 text-left   text-black space-y-1">
                    <p className="font-bold text-[12px]">
                        Quét mã QR để thanh toán
                    </p>
                    <p className="font-semibold text-[10px]">
                        {settings?.bank_name || "Techcombank"} {settings?.bank_account || "1902 9116 9690 16"}
                    </p>
                    <p className="font-semibold text-[10px]">
                        {settings?.bank_account_holder || "Nguyễn Thu Hằng"}
                    </p>
                </div>
            </div>

            <p className="text-center text-black text-[12px] font-bold mt-6 print:mt-5 uppercase tracking-wide">
                Trân trọng cảm ơn quý khách!
            </p>
        </>
    );
}
