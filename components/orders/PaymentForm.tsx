"use client";

import React, { useMemo, useState } from "react";
import { onlyDigits } from "@/lib/validation";
import { Order, Payment } from "@/lib/types";

export type PaymentFormData = {
    amount: string;
    method: Payment["payment_method"];
    splitPay: boolean;
    amount2: string;
    method2: Payment["payment_method"];
};

interface PaymentFormProps {
    order: Order;
    /** isPendingProcessPayment || payFlowBusy — khoá nút khi đang ghi nhận. */
    isSubmitting: boolean;
    onCancel: () => void;
    onSubmit: (data: PaymentFormData) => void;
}

const inputClass =
    "w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary";
const selectClass = inputClass + " appearance-none";

const fmtVnd = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(n);

/**
 * Form ghi nhận thanh toán (modal "Ghi nhận thanh toán"). Giữ state nhập liệu
 * (payForm) cục bộ — gõ số tiền chỉ re-render form này, KHÔNG re-render cả trang
 * OrdersPage (danh sách đơn + các modal khác). Trước đây payForm nằm ở OrdersPage
 * nên mỗi ký tự re-render toàn trang, làm bàn phím (tablet) tự ẩn. Cùng pattern với
 * <EditOrderForm>. Mount lại mỗi lần mở đơn (parent gate + key={order.id}).
 */
export function PaymentForm({
    order,
    isSubmitting,
    onCancel,
    onSubmit,
}: PaymentFormProps) {
    const [payForm, setPayForm] = useState<PaymentFormData>(() => {
        // Mở modal thanh toán → điền sẵn số tiền = còn nợ của đơn (như trước đây).
        const debt = order.total_amount - (order.paid_amount ?? 0);
        return {
            amount: debt > 0 ? String(debt) : "",
            method: "Cash",
            splitPay: false,
            amount2: "",
            method2: "Transfer",
        };
    });

    const preview = useMemo(() => {
        const total = order.total_amount;
        const paid = order.paid_amount ?? 0;
        const parsePositive = (s: string) => {
            const t = s.trim();
            if (t === "") return 0;
            const n = Number(t);
            return Number.isFinite(n) && n > 0 ? n : 0;
        };
        const a1 = parsePositive(payForm.amount);
        const a2 = payForm.splitPay ? parsePositive(payForm.amount2) : 0;
        const thisPayment = payForm.splitPay ? a1 + a2 : a1;
        const currentDebt = Math.max(0, total - paid);
        const paidAfter = paid + thisPayment;
        const remainingAfter = Math.max(0, total - paidAfter);
        return { total, paid, thisPayment, currentDebt, paidAfter, remainingAfter };
    }, [
        order.total_amount,
        order.paid_amount,
        payForm.amount,
        payForm.amount2,
        payForm.splitPay,
    ]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(payForm);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
                Chỉ cộng tiền đã thu. Khi đủ tiền, hệ thống tự đặt trạng thái{" "}
                <span className="font-semibold text-foreground">
                    Đã thanh toán
                </span>{" "}
                (hoặc chuyển{" "}
                <span className="font-semibold text-foreground">
                    Trả thiếu tiền
                </span>{" "}
                → Đã trả đồ nếu đơn đang nợ sau khi giao).
            </p>
            <div className="p-4 bg-muted/10 rounded-lg border border-border space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tổng cộng</span>
                    <span className="font-bold">{fmtVnd(preview.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Đã thu đến nay</span>
                    <span className="font-bold text-success">
                        {fmtVnd(preview.paid)}
                    </span>
                </div>
                {preview.thisPayment > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Sau khi ghi nhận lần này
                        </span>
                        <span className="font-bold text-success">
                            {fmtVnd(preview.paidAfter)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                    <span className="text-primary">
                        {preview.thisPayment > 0
                            ? "Còn lại (dự kiến)"
                            : "Còn lại"}
                    </span>
                    <span className="text-primary">
                        {fmtVnd(
                            preview.thisPayment > 0
                                ? preview.remainingAfter
                                : preview.currentDebt,
                        )}
                    </span>
                </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/5 p-3">
                <input
                    id="orders-list-split-pay"
                    type="checkbox"
                    checked={payForm.splitPay}
                    onChange={(e) =>
                        setPayForm((p) => ({
                            ...p,
                            splitPay: e.target.checked,
                        }))
                    }
                    className="mt-0.5 shrink-0"
                />
                <label
                    htmlFor="orders-list-split-pay"
                    className="cursor-pointer text-[11px] leading-snug text-muted-foreground"
                >
                    <span className="font-bold text-foreground">
                        Chia nhiều phương thức
                    </span>
                    {" — "}
                    ghi hai khoản trong một lần (vd. tiền mặt + chuyển khoản).
                </label>
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    {payForm.splitPay ? "Khoản 1 — số tiền" : "Số tiền thu"}
                </label>
                <input
                    required
                    type="text"
                    inputMode="numeric"
                    className={inputClass}
                    value={payForm.amount}
                    onChange={(e) =>
                        setPayForm((p) => ({
                            ...p,
                            amount: onlyDigits(e.target.value),
                        }))
                    }
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    {payForm.splitPay ? "Khoản 1 — phương thức" : "Phương thức"}
                </label>
                <select
                    className={selectClass}
                    value={payForm.method}
                    onChange={(e) =>
                        setPayForm((p) => ({
                            ...p,
                            method: e.target.value as Payment["payment_method"],
                        }))
                    }
                >
                    <option value="Cash">Tiền mặt</option>
                    <option value="Card">Thẻ</option>
                    <option value="Transfer">Chuyển khoản</option>
                </select>
            </div>
            {payForm.splitPay ? (
                <>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            Khoản 2 — số tiền
                        </label>
                        <input
                            required
                            type="text"
                            inputMode="numeric"
                            className={inputClass}
                            value={payForm.amount2}
                            onChange={(e) =>
                                setPayForm((p) => ({
                                    ...p,
                                    amount2: onlyDigits(e.target.value),
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            Khoản 2 — phương thức
                        </label>
                        <select
                            className={selectClass}
                            value={payForm.method2}
                            onChange={(e) =>
                                setPayForm((p) => ({
                                    ...p,
                                    method2: e.target
                                        .value as Payment["payment_method"],
                                }))
                            }
                        >
                            <option value="Cash">Tiền mặt</option>
                            <option value="Card">Thẻ</option>
                            <option value="Transfer">Chuyển khoản</option>
                        </select>
                    </div>
                </>
            ) : null}
            <div className="flex gap-4 mt-8">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
                >
                    {isSubmitting ? "Đang xử lý..." : "Ghi nhận thanh toán"}
                </button>
            </div>
        </form>
    );
}
