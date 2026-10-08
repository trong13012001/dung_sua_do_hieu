"use client";

import React, { memo, useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";
import { onlyDigits } from "@/lib/validation";
import { Order, Role, User } from "@/lib/types";
import { orderDetailStatusSelectOptions } from "@/lib/orderDetailStatusUi";

export type DetailEdit = {
    item_name: string;
    unit_price: string;
    description: string;
    status: string;
    assigned_tailor_id: string;
};

export type NewItemRow = {
    name: string;
    price: string;
    description: string;
    assigned_tailor_id: string;
};

export type EditOrderSubmitData = {
    orderStatusChoice: string;
    detailEdits: Record<number, DetailEdit>;
    newItems: NewItemRow[];
    /** Giá trị input ngày hẹn trả (yyyy-MM-dd); chỉ có khi `returnDate` prop được bật. */
    returnDate?: string;
};

type TailorOption = User & { role: Role | null };

interface EditOrderFormProps {
    order: Order;
    tailors: TailorOption[];
    statusOptions: ReadonlyArray<{ value: string; label: string }>;
    isPending: boolean;
    /** Khối "Lịch sử thay đổi" (OrderLogSection) — render phía trên form. */
    logSlot?: React.ReactNode;
    /** Bật ô "Ngày hẹn trả đồ"; `initial` là giá trị yyyy-MM-dd ban đầu. Bỏ qua nếu không cần. */
    returnDate?: { initial: string };
    onCancel: () => void;
    onRequestDeleteDetail: (detailId: number) => void;
    onSubmit: (data: EditOrderSubmitData) => void;
}

/** Radix Select không nhận value rỗng → giá trị thay thế cho "chưa phân công". */
const UNASSIGNED = "__none__";
const toSelect = (tailorId: string) => (tailorId === "" ? UNASSIGNED : tailorId);
const fromSelect = (value: string) => (value === UNASSIGNED ? "" : value);

function TailorSelect({
    value,
    onChange,
    tailors,
    ariaLabel,
}: {
    value: string;
    onChange: (tailorId: string) => void;
    tailors: TailorOption[];
    ariaLabel: string;
}) {
    return (
        <Select value={toSelect(value)} onValueChange={(v) => onChange(fromSelect(v))}>
            <SelectTrigger aria-label={ariaLabel} className="w-full min-w-0">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={UNASSIGNED}>Chưa phân công</SelectItem>
                {tailors.map((t) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>
                        {t.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/** Nhãn cột chỉ hiện trên mobile (desktop có hàng tiêu đề chung). */
const MobileLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[10px] font-bold uppercase text-muted-foreground sm:hidden">{children}</span>
);

/** Một món đã có trong đơn. memo: gõ ở dòng này không render lại các dòng khác. */
const DetailEditRow = memo(function DetailEditRow({
    detailId,
    edit,
    tailors,
    onChange,
    onDelete,
}: {
    detailId: number;
    edit: DetailEdit;
    tailors: TailorOption[];
    onChange: (detailId: number, field: keyof DetailEdit, value: string) => void;
    onDelete: (detailId: number) => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-12 sm:items-center sm:gap-2 sm:p-2">
            <label className="flex flex-col gap-1 sm:col-span-3">
                <MobileLabel>Tên SP</MobileLabel>
                <Input
                    value={edit.item_name}
                    onChange={(e) => onChange(detailId, "item_name", e.target.value)}
                    placeholder="Tên sản phẩm"
                    aria-label="Tên sản phẩm"
                />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
                <MobileLabel>Đơn giá (đ)</MobileLabel>
                <Input
                    inputMode="numeric"
                    value={edit.unit_price}
                    onChange={(e) => onChange(detailId, "unit_price", onlyDigits(e.target.value))}
                    placeholder="0"
                    aria-label="Đơn giá"
                />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
                <MobileLabel>Mô tả</MobileLabel>
                <Input
                    value={edit.description}
                    onChange={(e) => onChange(detailId, "description", e.target.value)}
                    placeholder="Tùy chọn"
                    aria-label="Mô tả"
                />
            </label>
            <div className="flex flex-col gap-1 sm:col-span-2">
                <MobileLabel>Trạng thái món</MobileLabel>
                <Select value={edit.status} onValueChange={(v) => onChange(detailId, "status", v)}>
                    <SelectTrigger aria-label="Trạng thái món" className="w-full min-w-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {orderDetailStatusSelectOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                                {s.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
                <MobileLabel>Thợ</MobileLabel>
                <TailorSelect
                    value={edit.assigned_tailor_id}
                    onChange={(v) => onChange(detailId, "assigned_tailor_id", v)}
                    tailors={tailors}
                    ariaLabel="Thợ"
                />
            </div>
            <div className="flex justify-end sm:col-span-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(detailId)}
                    aria-label="Xóa dòng"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 />
                </Button>
            </div>
        </div>
    );
});

/** Một dòng sản phẩm mới đang nhập. */
const NewItemEditRow = memo(function NewItemEditRow({
    index,
    row,
    tailors,
    onChange,
    onRemove,
}: {
    index: number;
    row: NewItemRow;
    tailors: TailorOption[];
    onChange: (index: number, field: keyof NewItemRow, value: string) => void;
    onRemove: (index: number) => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-12 sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
            <Input
                className="sm:col-span-3"
                value={row.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                placeholder="Tên sản phẩm"
                aria-label="Tên sản phẩm mới"
            />
            <Input
                className="sm:col-span-2"
                inputMode="numeric"
                value={row.price}
                onChange={(e) => onChange(index, "price", onlyDigits(e.target.value))}
                placeholder="Đơn giá"
                aria-label="Đơn giá"
            />
            <Input
                className="sm:col-span-2"
                value={row.description}
                onChange={(e) => onChange(index, "description", e.target.value)}
                placeholder="Mô tả"
                aria-label="Mô tả"
            />
            <div className="sm:col-span-4">
                <TailorSelect
                    value={row.assigned_tailor_id}
                    onChange={(v) => onChange(index, "assigned_tailor_id", v)}
                    tailors={tailors}
                    ariaLabel="Thợ"
                />
            </div>
            <div className="flex justify-end sm:col-span-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(index)}
                    aria-label="Xóa dòng"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 />
                </Button>
            </div>
        </div>
    );
});

function buildDetailEdits(order: Order): Record<number, DetailEdit> {
    const edits: Record<number, DetailEdit> = {};
    order.details?.forEach((d) => {
        edits[d.id] = {
            item_name: d.item_name ?? "",
            unit_price: String(d.unit_price ?? ""),
            description: d.description ?? "",
            status: d.status,
            assigned_tailor_id: d.assigned_tailor_id
                ? String(d.assigned_tailor_id)
                : "",
        };
    });
    return edits;
}

/**
 * Form sửa đơn (modal "Cập nhật đơn"). Giữ toàn bộ state nhập liệu (detailEdits,
 * newItems) cục bộ trong component này — gõ phím chỉ re-render form, KHÔNG re-render
 * cả trang OrdersPage (danh sách đơn + các modal khác). Trước đây state nằm ở
 * OrdersPage nên mỗi ký tự re-render toàn trang, làm bàn phím (tablet) tự ẩn.
 *
 * Mount lại mỗi lần mở đơn (parent gate bằng `editingOrder && <EditOrderForm .../>`),
 * nên useState initializer dựng đúng giá trị ban đầu.
 */
export function EditOrderForm({
    order,
    tailors,
    statusOptions,
    isPending,
    logSlot,
    returnDate,
    onCancel,
    onRequestDeleteDetail,
    onSubmit,
}: EditOrderFormProps) {
    const [detailEdits, setDetailEdits] = useState<Record<number, DetailEdit>>(
        () => buildDetailEdits(order),
    );
    const [newItems, setNewItems] = useState<NewItemRow[]>([]);
    const [returnDateValue, setReturnDateValue] = useState(
        returnDate?.initial ?? "",
    );

    const setDetailEdit = useCallback(
        (detailId: number, field: keyof DetailEdit, value: string) => {
            setDetailEdits((prev) => ({
                ...prev,
                [detailId]: {
                    ...(prev[detailId] ?? ({} as DetailEdit)),
                    [field]: value,
                },
            }));
        },
        [],
    );

    const addNewItemRow = () => {
        setNewItems((prev) => [
            ...prev,
            { name: "", price: "", description: "", assigned_tailor_id: "" },
        ]);
    };

    const updateNewItem = useCallback(
        (index: number, field: keyof NewItemRow, value: string) => {
            setNewItems((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], [field]: value };
                return next;
            });
        },
        [],
    );

    const removeNewItem = useCallback((index: number) => {
        setNewItems((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const orderStatusChoice =
            (fd.get("order-status") as string) || order.status;
        onSubmit({
            orderStatusChoice,
            detailEdits,
            newItems,
            ...(returnDate ? { returnDate: returnDateValue } : {}),
        });
    };

    return (
        <>
            {logSlot}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className={returnDate ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : undefined}>
                    <FormField label="Trạng thái đơn hàng" htmlFor="order-status">
                        <Select name="order-status" defaultValue={order.status || "New"}>
                            <SelectTrigger id="order-status" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>

                    {returnDate && (
                        <FormField label="Ngày hẹn trả đồ" htmlFor="return-date">
                            <Input
                                id="return-date"
                                type="date"
                                value={returnDateValue}
                                onChange={(e) => setReturnDateValue(e.target.value)}
                            />
                        </FormField>
                    )}
                </div>

                {order.details && order.details.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                            Chi tiết sản phẩm ({order.details.length})
                        </p>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                            Giao từng món: chọn &quot;Đã giao món&quot; hoặc &quot;Đã giao — nợ món&quot; khi khách chỉ
                            nhận / chỉ trả trước một phần đồ. Tiền vẫn ghi ở nút thanh toán đơn.
                        </p>
                        <div className="overflow-hidden rounded-lg border border-border">
                            <div className="hidden grid-cols-12 gap-2 border-b border-border bg-muted/40 px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground sm:grid">
                                <span className="col-span-3">Tên SP</span>
                                <span className="col-span-2">Đơn giá (đ)</span>
                                <span className="col-span-2">Mô tả</span>
                                <span className="col-span-2">Trạng thái món</span>
                                <span className="col-span-2">Thợ</span>
                                <span className="col-span-1" />
                            </div>
                            <div className="custom-scrollbar max-h-[min(50vh,400px)] divide-y divide-border/60 overflow-y-auto">
                                {order.details.map((d) => {
                                    const edit = detailEdits[d.id];
                                    if (!edit) return null;
                                    return (
                                        <DetailEditRow
                                            key={d.id}
                                            detailId={d.id}
                                            edit={edit}
                                            tailors={tailors}
                                            onChange={setDetailEdit}
                                            onDelete={onRequestDeleteDetail}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">Thêm sản phẩm</p>
                        <Button type="button" variant="ghost" size="sm" onClick={addNewItemRow} className="text-primary">
                            <Plus /> Thêm dòng
                        </Button>
                    </div>
                    {newItems.length > 0 && (
                        <div className="custom-scrollbar max-h-[260px] space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                            {newItems.map((row, idx) => (
                                <NewItemEditRow
                                    key={idx}
                                    index={idx}
                                    row={row}
                                    tailors={tailors}
                                    onChange={updateNewItem}
                                    onRemove={removeNewItem}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Hủy
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Đang lưu..." : "Cập nhật"}
                    </Button>
                </div>
            </form>
        </>
    );
}
