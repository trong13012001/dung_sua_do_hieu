"use client";

import React from "react";
import dynamic from "next/dynamic";

const ReactBarcode = dynamic(() => import("react-barcode"), { ssr: false });

export interface OrderBarcodeProps {
    readonly value: string;
    readonly className?: string;
    /** Thu nhỏ cho đầu hóa đơn nhiệt (cạnh logo), giữ mặc định cho tem nhãn */
    readonly compact?: boolean;
    /**
     * Tem từng món — khớp PrintPage C#: Code128 ~90×45px, chữ mã Arial 8 italic.
     */
    readonly itemLabel?: boolean;
}

export function OrderBarcode({
    value,
    className,
    compact = false,
    itemLabel = false,
}: Readonly<OrderBarcodeProps>) {
    if (!value) return null;

    let height = 40;
    let barWidth = 1.2;
    let mod = "";
    let hriClass =
        "tracking-wide font-normal text-black tabular-nums text-[9px] tracking-[0.18em]";
    if (itemLabel) {
        /* C# DrawImage(bar, 10, i*124+10, 90, 45) */
        height = 45;
        barWidth = 1.05;
        mod = "invoice-order-barcode--item-label";
        hriClass =
            "item-label-barcode-hri tracking-wide text-black tabular-nums text-[8px] leading-tight italic font-normal";
    } else if (compact) {
        height = 25;
        barWidth = 0.95;
        mod = "invoice-order-barcode--compact";
        hriClass =
            "tracking-wide font-normal text-black tabular-nums text-[7px] leading-none";
    }

    return (
        <div
            className={`invoice-order-barcode shrink-0 ${mod} ${className ?? ""}`}
        >
            <div className="flex flex-col items-start gap-0">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <ReactBarcode
                    value={value}
                    format="CODE128"
                    height={height}
                    width={barWidth}
                    displayValue={false}
                    margin={0}
                    background="transparent"
                    lineColor="#000000"
                />
                <span className={hriClass}>{value}</span>
            </div>
        </div>
    );
}
