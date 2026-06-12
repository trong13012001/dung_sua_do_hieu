"use client";

import React, { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
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
};

type TailorOption = User & { role: Role | null };

interface EditOrderFormProps {
    order: Order;
    tailors: TailorOption[];
    statusOptions: ReadonlyArray<{ value: string; label: string }>;
    isPending: boolean;
    /** Khối "Lịch sử thay đổi" (OrderLogSection) — render phía trên form. */
    logSlot?: React.ReactNode;
    onCancel: () => void;
    onRequestDeleteDetail: (detailId: number) => void;
    onSubmit: (data: EditOrderSubmitData) => void;
}

const selectClass =
    "w-full bg-muted/20 border border-border rounded-md px-3 py-2 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary";

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
    onCancel,
    onRequestDeleteDetail,
    onSubmit,
}: EditOrderFormProps) {
    const [detailEdits, setDetailEdits] = useState<Record<number, DetailEdit>>(
        () => buildDetailEdits(order),
    );
    const [newItems, setNewItems] = useState<NewItemRow[]>([]);

    const setDetailEdit = (
        detailId: number,
        field: keyof DetailEdit,
        value: string,
    ) => {
        setDetailEdits((prev) => ({
            ...prev,
            [detailId]: {
                ...(prev[detailId] ?? ({} as DetailEdit)),
                [field]: value,
            },
        }));
    };

    const addNewItemRow = () => {
        setNewItems((prev) => [
            ...prev,
            { name: "", price: "", description: "", assigned_tailor_id: "" },
        ]);
    };

    const updateNewItem = (
        index: number,
        field: keyof NewItemRow,
        value: string,
    ) => {
        setNewItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeNewItem = (index: number) => {
        setNewItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const orderStatusChoice =
            (fd.get("order-status") as string) || order.status;
        onSubmit({ orderStatusChoice, detailEdits, newItems });
    };

    return (
        <>
            {logSlot}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Trạng thái đơn hàng
                    </label>
                    <div className="relative">
                        <select
                            name="order-status"
                            className={selectClass}
                            defaultValue={order.status || "New"}
                        >
                            {statusOptions.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            size={14}
                        />
                    </div>
                </div>

                {order.details && order.details.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">
                            Chi tiết sản phẩm ({order.details.length})
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                            Giao từng món: chọn &quot;Đã giao món&quot; hoặc
                            &quot;Đã giao — nợ món&quot; khi khách chỉ nhận / chỉ
                            trả trước một phần đồ. Tiền vẫn ghi ở nút thanh toán
                            đơn.
                        </p>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="max-h-[min(50vh,400px)] overflow-y-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 bg-muted/30 border-b border-border z-10">
                                        <tr>
                                            <th className="text-left p-2 font-bold text-[10px] uppercase text-muted-foreground w-[22%]">
                                                Tên SP
                                            </th>
                                            <th className="text-left p-2 font-bold text-[10px] uppercase text-muted-foreground w-[12%]">
                                                Đơn giá (đ)
                                            </th>
                                            <th className="text-left p-2 font-bold text-[10px] uppercase text-muted-foreground w-[18%]">
                                                Mô tả
                                            </th>
                                            <th className="text-left p-2 font-bold text-[10px] uppercase text-muted-foreground w-[22%]">
                                                Trạng thái món
                                            </th>
                                            <th className="text-left p-2 font-bold text-[10px] uppercase text-muted-foreground w-[22%]">
                                                Thợ
                                            </th>
                                            <th className="w-10 p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.details.map((d) => {
                                            const edit = detailEdits[d.id];
                                            if (!edit) return null;
                                            return (
                                                <tr
                                                    key={d.id}
                                                    className="border-b border-border/50 last:border-0 hover:bg-muted/10"
                                                >
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            value={edit.item_name}
                                                            onChange={(e) =>
                                                                setDetailEdit(
                                                                    d.id,
                                                                    "item_name",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="Tên sản phẩm"
                                                            className={
                                                                selectClass +
                                                                " min-w-0"
                                                            }
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={edit.unit_price}
                                                            onChange={(e) =>
                                                                setDetailEdit(
                                                                    d.id,
                                                                    "unit_price",
                                                                    onlyDigits(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            placeholder="0"
                                                            className={
                                                                selectClass +
                                                                " min-w-0"
                                                            }
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            value={
                                                                edit.description
                                                            }
                                                            onChange={(e) =>
                                                                setDetailEdit(
                                                                    d.id,
                                                                    "description",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="Tùy chọn"
                                                            className={
                                                                selectClass +
                                                                " min-w-0"
                                                            }
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <div className="relative">
                                                            <select
                                                                value={edit.status}
                                                                onChange={(e) =>
                                                                    setDetailEdit(
                                                                        d.id,
                                                                        "status",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className={
                                                                    selectClass +
                                                                    " min-w-0"
                                                                }
                                                            >
                                                                {orderDetailStatusSelectOptions.map(
                                                                    (s) => (
                                                                        <option
                                                                            key={
                                                                                s.value
                                                                            }
                                                                            value={
                                                                                s.value
                                                                            }
                                                                        >
                                                                            {
                                                                                s.label
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                            <ChevronDown
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                                                size={12}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-1.5">
                                                        <div className="relative">
                                                            <select
                                                                value={
                                                                    edit.assigned_tailor_id
                                                                }
                                                                onChange={(e) =>
                                                                    setDetailEdit(
                                                                        d.id,
                                                                        "assigned_tailor_id",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className={
                                                                    selectClass +
                                                                    " min-w-0"
                                                                }
                                                            >
                                                                <option value="">
                                                                    Chưa phân công
                                                                </option>
                                                                {tailors.map(
                                                                    (t) => (
                                                                        <option
                                                                            key={String(
                                                                                t.id,
                                                                            )}
                                                                            value={String(
                                                                                t.id,
                                                                            )}
                                                                        >
                                                                            {t.name}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                            <ChevronDown
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                                                size={12}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onRequestDeleteDetail(
                                                                    d.id,
                                                                )
                                                            }
                                                            className="p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                                                            title="Xóa dòng"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">
                            Thêm sản phẩm
                        </p>
                        <button
                            type="button"
                            onClick={addNewItemRow}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            + Thêm dòng
                        </button>
                    </div>
                    {newItems.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="max-h-[200px] overflow-y-auto p-2 space-y-2 bg-muted/5">
                                {newItems.map((row, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-12 gap-2 items-center"
                                    >
                                        <div className="col-span-3">
                                            <input
                                                type="text"
                                                value={row.name}
                                                onChange={(e) =>
                                                    updateNewItem(
                                                        idx,
                                                        "name",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Tên sản phẩm"
                                                className={selectClass}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={row.price}
                                                onChange={(e) =>
                                                    updateNewItem(
                                                        idx,
                                                        "price",
                                                        onlyDigits(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                                placeholder="Đơn giá"
                                                className={selectClass}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                value={row.description}
                                                onChange={(e) =>
                                                    updateNewItem(
                                                        idx,
                                                        "description",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Mô tả"
                                                className={selectClass}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <select
                                                value={row.assigned_tailor_id}
                                                onChange={(e) =>
                                                    updateNewItem(
                                                        idx,
                                                        "assigned_tailor_id",
                                                        e.target.value,
                                                    )
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">
                                                    Chưa phân công
                                                </option>
                                                {tailors.map((t) => (
                                                    <option
                                                        key={String(t.id)}
                                                        value={String(t.id)}
                                                    >
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeNewItem(idx)}
                                                className="p-2 text-muted-foreground hover:text-danger"
                                                title="Xóa dòng"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
                    >
                        {isPending ? "Đang lưu..." : "Cập nhật"}
                    </button>
                </div>
            </form>
        </>
    );
}
