"use client";

import React, { useMemo, useState } from "react";
import { onlyDigits } from "@/lib/validation";
import { Order, Payment } from "@/lib/types";
import { formatVnd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";

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

const PAYMENT_METHODS = [
    { value: "Cash", label: "Tiền mặt" },
    { value: "Card", label: "Thẻ" },
    { value: "Transfer", label: "Chuyển khoản" },
] as const;

function MethodSelect({
    id,
    value,
    onChange,
}: {
    id: string;
    value: Payment["payment_method"];
    onChange: (v: Payment["payment_method"]) => void;
}) {
    return (
        <Select value={value} onValueChange={(v) => onChange(v as Payment["payment_method"])}>
            <SelectTrigger id={id} className="w-full">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                        {m.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

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
            <p className="text-[11px] leading-relaxed text-muted-foreground">
                Chỉ cộng tiền đã thu. Khi đủ tiền, hệ thống tự đặt trạng thái{" "}
                <span className="font-semibold text-foreground">Đã thanh toán</span> (hoặc chuyển{" "}
                <span className="font-semibold text-foreground">Trả thiếu tiền</span> → Đã trả đồ nếu đơn đang nợ sau
                khi giao).
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tổng cộng</span>
                    <span className="font-bold">{formatVnd(preview.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Đã thu đến nay</span>
                    <span className="font-bold text-success">{formatVnd(preview.paid)}</span>
                </div>
                {preview.thisPayment > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sau khi ghi nhận lần này</span>
                        <span className="font-bold text-success">{formatVnd(preview.paidAfter)}</span>
                    </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-primary">
                    <span>{preview.thisPayment > 0 ? "Còn lại (dự kiến)" : "Còn lại"}</span>
                    <span>
                        {formatVnd(preview.thisPayment > 0 ? preview.remainingAfter : preview.currentDebt)}
                    </span>
                </div>
            </div>

            <label
                htmlFor="orders-list-split-pay"
                className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/5"
            >
                <Checkbox
                    id="orders-list-split-pay"
                    checked={payForm.splitPay}
                    onCheckedChange={(checked) => setPayForm((p) => ({ ...p, splitPay: checked === true }))}
                    className="mt-0.5"
                />
                <span className="text-[11px] leading-snug text-muted-foreground">
                    <span className="font-bold text-foreground">Chia nhiều phương thức</span>
                    {" — "}ghi hai khoản trong một lần (vd. tiền mặt + chuyển khoản).
                </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label={payForm.splitPay ? "Khoản 1 — số tiền" : "Số tiền thu"} htmlFor="pay-amount">
                    <Input
                        id="pay-amount"
                        required
                        inputMode="numeric"
                        autoFocus
                        value={payForm.amount}
                        onChange={(e) => setPayForm((p) => ({ ...p, amount: onlyDigits(e.target.value) }))}
                    />
                </FormField>
                <FormField label={payForm.splitPay ? "Khoản 1 — phương thức" : "Phương thức"} htmlFor="pay-method">
                    <MethodSelect
                        id="pay-method"
                        value={payForm.method}
                        onChange={(method) => setPayForm((p) => ({ ...p, method }))}
                    />
                </FormField>
                {payForm.splitPay && (
                    <>
                        <FormField label="Khoản 2 — số tiền" htmlFor="pay-amount-2">
                            <Input
                                id="pay-amount-2"
                                required
                                inputMode="numeric"
                                value={payForm.amount2}
                                onChange={(e) => setPayForm((p) => ({ ...p, amount2: onlyDigits(e.target.value) }))}
                            />
                        </FormField>
                        <FormField label="Khoản 2 — phương thức" htmlFor="pay-method-2">
                            <MethodSelect
                                id="pay-method-2"
                                value={payForm.method2}
                                onChange={(method2) => setPayForm((p) => ({ ...p, method2 }))}
                            />
                        </FormField>
                    </>
                )}
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Đang xử lý..." : "Ghi nhận thanh toán"}
                </Button>
            </div>
        </form>
    );
}
