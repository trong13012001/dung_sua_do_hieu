"use client";

import React, {
    useState,
    useRef,
    useEffect,
    useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search,
    ShoppingBag,
    Calendar,
    ChevronDown,
    Edit2,
    Trash2,
    DollarSign,
    FileDown,
    Printer,
    Loader2,
    ListOrdered,
    PackageCheck,
    CheckCircle2,
    UserCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
    useOrdersPage,
    useUpdateOrder,
    useUpdateOrderDetail,
    useAddOrderDetails,
    useDeleteOrder,
    useDeleteOrderDetail,
    fetchOrdersForExport,
    type OrdersFilters,
    type NewOrderDetailItem,
} from "@/api/orders";
import { useOrderLogs } from "@/api/orderLogs";
import { useProcessPayment } from "@/api/payments";
import { useEmployees } from "@/api/users";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGetOrder } from "@/hooks/order/useGetOrder";
import { Modal } from "@/components/ui/Modal";
import { Toast, useToast } from "@/components/ui/Toast";
import {
    InvoicePrint,
    InvoicePrintContent,
} from "@/components/ui/InvoicePrint";
import { ItemLabelsPrint } from "@/components/ui/ItemLabelsPrint";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";
import { decodeBarcode } from "@/lib/barcode";
import { useDebounce } from "@/hooks/useDebounce";
import { Order, OrderDetail, User, Role } from "@/lib/types";
import { validateRequired, validateNumber } from "@/lib/validation";
import { printElementSmart } from "@/lib/printSmart";
import { PRINT_TARGET_INVOICE_XP80C } from "@/lib/printTargets";
import { isSilentThermalConfigured } from "@/lib/print/thermalPrint";
import { resolveStatusWhenMarkingDelivered } from "@/lib/orderStatusUi";
import {
    orderDetailStatusBadgeClass,
    orderDetailStatusLabelVi,
    orderDetailStatusSelectOptions,
} from "@/lib/orderDetailStatusUi";

const statusOptions = [
    { value: "New", label: "Mới", color: "bg-info/10 text-info" },
    {
        value: "In Progress",
        label: "Đang xử lý",
        color: "bg-warning/10 text-warning",
    },
    { value: "Ready", label: "Đã xong", color: "bg-success/10 text-success" },
    {
        value: "Paid",
        label: "Đã thanh toán",
        color: "bg-emerald-600/12 text-emerald-800 dark:text-emerald-400",
    },
    {
        value: "Delivered",
        label: "Đã trả đồ",
        color: "bg-primary/10 text-primary",
    },
    {
        value: "DeliveredOwing",
        label: "Trả thiếu tiền",
        color: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
    },
    {
        value: "Completed",
        label: "Hoàn thành",
        color: "bg-secondary/10 text-secondary",
    },
];

const getStatusStyle = (status: string) =>
    statusOptions.find((s) => s.value === status) || statusOptions[0];

const statusLabelMap: Record<string, string> = {
    New: "Mới",
    "In Progress": "Đang làm",
    Ready: "Đã xong",
    Paid: "Đã thanh toán",
    Delivered: "Đã trả đồ",
    DeliveredOwing: "Trả thiếu tiền",
    Completed: "Hoàn thành",
};

const paymentMethodLabelMap: Record<string, string> = {
    Cash: "Tiền mặt",
    Card: "Thẻ",
    Transfer: "Chuyển khoản",
};

function getLatestPaymentMethod(order: Order): string {
    const latest = (order.payments || [])
        .slice()
        .sort(
            (a, b) =>
                new Date(b.payment_time).getTime() -
                new Date(a.payment_time).getTime(),
        )[0];
    if (!latest?.payment_method) return "";
    return paymentMethodLabelMap[latest.payment_method] || latest.payment_method;
}

function getDeliveryStatusLabel(order: Order): string {
    if (order.status === "Delivered" || order.status === "Completed") {
        return "Đã trả đồ";
    }
    if (order.status === "DeliveredOwing") {
        return "Đã trả đồ (còn nợ)";
    }
    return "";
}

function OrderLogSection({ orderId }: { orderId: number | null }) {
    const { data: logs, isLoading } = useOrderLogs(orderId);
    const [open, setOpen] = useState(false);
    if (!orderId) return null;
    return (
        <div className="mb-4 border border-border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase bg-muted/20 flex justify-between items-center"
            >
                Lịch sử thay đổi
                <ChevronDown
                    size={14}
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open && (
                <div className="max-h-40 overflow-y-auto p-3 space-y-2 text-xs">
                    {isLoading ? (
                        <p className="text-muted-foreground italic">
                            Đang tải...
                        </p>
                    ) : logs && logs.length > 0 ? (
                        logs.map((log: any) => (
                            <div
                                key={log.id}
                                className="flex justify-between gap-2 text-muted-foreground border-b border-border/50 pb-1.5 last:border-0"
                            >
                                <span>{log.action}</span>
                                <span>
                                    {log.user?.name || "Hệ thống"} ·{" "}
                                    {new Date(log.created_at).toLocaleString(
                                        "vi-VN",
                                    )}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground italic">
                            Chưa có lịch sử
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function OrdersPage() {
    const PAGE_SIZE = 25;
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentUserId = useCurrentUserId();
    const { data: employees } = useEmployees();
    const {
        mutateAsync: mutateAsyncUpdateOrder,
        isPending: isPendingUpdateOrder,
    } = useUpdateOrder();

    const {
        mutateAsync: mutateAsyncUpdateDetail,
        isPending: isPendingUpdateDetail,
    } = useUpdateOrderDetail();

    const {
        mutateAsync: mutateAsyncAddOrderDetails,
        isPending: isPendingAddOrderDetails,
    } = useAddOrderDetails();

    const {
        mutateAsync: mutateAsyncDeleteOrder,
        isPending: isPendingDeleteOrder,
    } = useDeleteOrder();

    const {
        mutateAsync: mutateAsyncDeleteDetail,
        isPending: isPendingDeleteDetail,
    } = useDeleteOrderDetail();

    const {
        mutateAsync: mutateAsyncProcessPayment,
        isPending: isPendingProcessPayment,
    } = useProcessPayment();
    const { toast, showToast, hideToast } = useToast();

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [statusFilter, setStatusFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
    const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
    const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null);
    const [deletingDetailId, setDeletingDetailId] = useState<number | null>(
        null,
    );
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
    const [detailModalOrderId, setDetailModalOrderId] = useState<
        number | string | null
    >(null);
    const [labelOrder, setLabelOrder] = useState<Order | null>(null);
    /** null = in tất cả món; mảng STT 1-based = chỉ các dòng đó (barcode đúng vị trí trong đơn). */
    const [labelLineIndices, setLabelLineIndices] = useState<number[] | null>(
        null,
    );
    const [selectedForPrint, setSelectedForPrint] = useState<Set<number>>(
        new Set(),
    );
    const [page, setPage] = useState(1);
    const [batchPrintOpen, setBatchPrintOpen] = useState(false);
    const [batchPrinting, setBatchPrinting] = useState(false);
    const [payForm, setPayForm] = useState<{
        amount: string;
        method: "Cash" | "Card" | "Transfer";
    }>({ amount: "", method: "Cash" });

    const paymentModalPreview = useMemo(() => {
        if (!payingOrder) return null;
        const total = payingOrder.total_amount;
        const paid = payingOrder.paid_amount ?? 0;
        const raw = payForm.amount.trim();
        const parsed = raw === "" ? 0 : Number(raw);
        const thisPayment =
            Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        const currentDebt = Math.max(0, total - paid);
        const paidAfter = paid + thisPayment;
        const remainingAfter = Math.max(0, total - paidAfter);
        return {
            total,
            paid,
            thisPayment,
            currentDebt,
            paidAfter,
            remainingAfter,
        };
    }, [payingOrder, payForm.amount]);
    const completingDebt =
        completingOrder === null
            ? 0
            : completingOrder.total_amount -
              (completingOrder.paid_amount ?? 0);
    const deliveringDebt =
        deliveringOrder === null
            ? 0
            : deliveringOrder.total_amount -
              (deliveringOrder.paid_amount ?? 0);
    const [exporting, setExporting] = useState(false);
    type DetailEdit = {
        item_name: string;
        unit_price: string;
        description: string;
        status: string;
        assigned_tailor_id: string;
    };
    const [detailEdits, setDetailEdits] = useState<Record<number, DetailEdit>>(
        {},
    );
    const [newItems, setNewItems] = useState<
        Array<{
            name: string;
            price: string;
            description: string;
            assigned_tailor_id: string;
        }>
    >([]);

    const openEditModal = (order: Order) => {
        setEditingOrder(order);
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
        setDetailEdits(edits);
        setNewItems([]);
    };

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
        field: "name" | "price" | "description" | "assigned_tailor_id",
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

    const filters: OrdersFilters = {
        status: statusFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: (() => {
            const kw = debouncedSearch.trim();
            if (!kw) return undefined;
            const parsed = decodeBarcode(kw);
            if (parsed?.kind === "invoice" || parsed?.kind === "item") {
                return parsed.transactionCode;
            }
            if (parsed?.kind === "legacy_invoice") {
                return String(parsed.orderId);
            }
            return kw;
        })(),
    };
    const { data, isLoading, isFetching } = useOrdersPage(
        filters,
        page,
        PAGE_SIZE,
    );
    const orders = data?.items ?? [];
    const totalOrders = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
    const deepLinkEditIdRaw = searchParams.get("editOrderId");
    const deepLinkEditId = deepLinkEditIdRaw
        ? Number(deepLinkEditIdRaw)
        : null;
    const shouldFetchDeepLinkOrder =
        deepLinkEditId != null &&
        Number.isFinite(deepLinkEditId) &&
        deepLinkEditId > 0;
    const { data: deepLinkedOrder } = useGetOrder(
        shouldFetchDeepLinkOrder ? deepLinkEditId : null,
    );
    const deepLinkHandledRef = useRef<string | null>(null);

    const batchPrintRootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, startDate, endDate]);

    useEffect(() => {
        if (!deepLinkEditIdRaw) {
            deepLinkHandledRef.current = null;
            return;
        }
        if (deepLinkHandledRef.current === deepLinkEditIdRaw) return;
        if (deepLinkEditId == null || !Number.isFinite(deepLinkEditId)) return;
        const foundInList = orders.find((o) => o.id === deepLinkEditId);
        const targetOrder = foundInList ?? deepLinkedOrder ?? null;
        if (!targetOrder) return;
        openEditModal(targetOrder);
        deepLinkHandledRef.current = deepLinkEditIdRaw;
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("editOrderId");
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `/orders?${nextQuery}` : "/orders");
    }, [
        deepLinkEditId,
        deepLinkEditIdRaw,
        deepLinkedOrder,
        orders,
        router,
        searchParams,
    ]);

    const tailors =
        employees?.filter(
            (e: User & { role: Role | null }) => e.role?.name === "Thợ may",
        ) || [];

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingOrder) return;
        const fd = new FormData(e.currentTarget);
        try {
            const orderStatusChoice =
                (fd.get("order-status") as string) || editingOrder.status;
            if (
                orderStatusChoice === "Completed" &&
                editingOrder.status !== "Completed"
            ) {
                const editDebt =
                    editingOrder.total_amount -
                    (editingOrder.paid_amount || 0);
                if (editDebt > 0) {
                    showToast(
                        "Chỉ hoàn thành đơn khi đã thu đủ tiền (còn nợ trên đơn).",
                        "error",
                    );
                    return;
                }
            }
            if (
                orderStatusChoice &&
                orderStatusChoice !== editingOrder.status
            ) {
                await mutateAsyncUpdateOrder({
                    id: editingOrder.id,
                    order: {
                        status: orderStatusChoice as Order["status"],
                    },
                    updated_by: currentUserId ?? undefined,
                });
            }
            for (const detail of editingOrder.details || []) {
                const edit = detailEdits[detail.id];
                if (!edit) continue;
                const priceNum = Number(edit.unit_price);
                if (
                    edit.unit_price.trim() !== "" &&
                    (Number.isNaN(priceNum) || priceNum < 0)
                ) {
                    showToast(
                        `Sản phẩm "${edit.item_name || detail.item_name}": Đơn giá không hợp lệ`,
                        "error",
                    );
                    return;
                }
                const patch: Partial<OrderDetail> = {};
                if (edit.item_name.trim() !== detail.item_name)
                    patch.item_name = edit.item_name.trim();
                if (
                    edit.unit_price.trim() !== "" &&
                    priceNum !== Number(detail.unit_price)
                )
                    patch.unit_price = priceNum;
                if (edit.description !== (detail.description ?? ""))
                    patch.description = edit.description.trim() || null;
                if (
                    orderStatusChoice === "Completed" &&
                    detail.status !== "Completed"
                ) {
                    patch.status = "Completed";
                } else if (edit.status !== detail.status) {
                    patch.status = edit.status as OrderDetail["status"];
                }
                const origTailor = detail.assigned_tailor_id
                    ? String(detail.assigned_tailor_id)
                    : "";
                if (edit.assigned_tailor_id !== origTailor)
                    patch.assigned_tailor_id = edit.assigned_tailor_id
                        ? edit.assigned_tailor_id
                        : null;
                if (Object.keys(patch).length > 0) {
                    await mutateAsyncUpdateDetail({
                        id: detail.id,
                        detail: patch,
                        updated_by: currentUserId ?? undefined,
                    });
                }
            }
            for (let i = 0; i < newItems.length; i++) {
                const row = newItems[i];
                const hasName = row.name.trim() !== "";
                const priceErr = validateNumber(row.price, {
                    min: 0,
                    required: hasName,
                    fieldName: "Đơn giá",
                });
                if (hasName && priceErr) {
                    showToast(
                        `Dòng ${i + 1} (${row.name.trim()}): ${priceErr}`,
                        "error",
                    );
                    return;
                }
                if (
                    !hasName &&
                    row.price.trim() !== "" &&
                    Number(row.price) > 0
                ) {
                    showToast(`Dòng ${i + 1}: Nhập tên sản phẩm`, "error");
                    return;
                }
            }
            const toAdd: NewOrderDetailItem[] = newItems
                .filter(
                    (row) => row.name.trim() !== "" && Number(row.price) >= 0,
                )
                .map((row) => ({
                    item_name: row.name.trim(),
                    unit_price: Number(row.price),
                    description: row.description.trim() || null,
                    assigned_tailor_id: row.assigned_tailor_id?.trim()
                        ? row.assigned_tailor_id.trim()
                        : null,
                }));
            if (toAdd.length > 0) {
                await mutateAsyncAddOrderDetails({
                    orderId: editingOrder.id,
                    items: toAdd,
                    updated_by: currentUserId ?? undefined,
                });
            }
            setEditingOrder(null);
            showToast("Cập nhật đơn hàng thành công", "success");
        } catch (err: any) {
            showToast("Lỗi: " + err.message, "error");
        }
    };

    const handleDelete = async () => {
        if (!deletingOrder) return;
        try {
            await mutateAsyncDeleteOrder({
                id: deletingOrder.id,
                updated_by: currentUserId ?? undefined,
            });
            setDeletingOrder(null);
            showToast("Xóa đơn hàng thành công", "success");
        } catch (err: any) {
            showToast("Lỗi: " + err.message, "error");
        }
    };

    const handleDeleteDetail = async (detailId: number) => {
        if (!editingOrder) return;
        try {
            await mutateAsyncDeleteDetail({
                id: detailId,
                updated_by: currentUserId ?? undefined,
            });
            const d = editingOrder.details?.find((x) => x.id === detailId);
            const newDetails = (editingOrder.details ?? []).filter(
                (x) => x.id !== detailId,
            );
            const subtract = d ? Number(d.unit_price) || 0 : 0;
            setEditingOrder({
                ...editingOrder,
                details: newDetails,
                total_amount: Math.max(0, editingOrder.total_amount - subtract),
            });
            setDetailEdits((prev) => {
                const next = { ...prev };
                delete next[detailId];
                return next;
            });
            setDeletingDetailId(null);
            showToast("Đã xóa dòng sản phẩm", "success");
        } catch (err: any) {
            showToast("Lỗi: " + err.message, "error");
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingOrder) return;
        const amountErr = validateNumber(payForm.amount, {
            min: 1,
            fieldName: "Số tiền thanh toán",
        });
        if (amountErr) {
            showToast(amountErr, "error");
            return;
        }
        try {
            await mutateAsyncProcessPayment({
                order_id: payingOrder.id,
                amount: Number(payForm.amount),
                payment_method: payForm.method as any,
                updated_by: currentUserId ?? undefined,
            });
            setPayingOrder(null);
            setPayForm({ amount: "", method: "Cash" });
            showToast("Đã ghi nhận thanh toán.", "success");
        } catch (err: any) {
            showToast("Lỗi: " + err.message, "error");
        }
    };

    const handleConfirmDeliverFromList = async () => {
        if (!deliveringOrder) return;
        try {
            const status = resolveStatusWhenMarkingDelivered(deliveringOrder);
            await mutateAsyncUpdateOrder({
                id: deliveringOrder.id,
                order: {
                    status,
                    return_time: new Date().toISOString(),
                },
                updated_by: currentUserId ?? undefined,
            });
            setDeliveringOrder(null);
            showToast(
                status === "DeliveredOwing"
                    ? "Đã ghi nhận trả đồ — Trả thiếu tiền (còn nợ)."
                    : "Đã ghi nhận trả đồ.",
                "success",
            );
        } catch (err: any) {
            showToast("Lỗi: " + err.message, "error");
        }
    };

    const handleMarkCompletedFromList = async (
        order: Order,
    ): Promise<boolean> => {
        if (order.status === "Completed") return false;
        const listDebt =
            order.total_amount - (order.paid_amount ?? 0);
        if (listDebt > 0) {
            showToast(
                "Chỉ hoàn thành đơn khi đã thu đủ tiền (còn nợ trên đơn).",
                "error",
            );
            return false;
        }
        try {
            for (const d of order.details ?? []) {
                if (d.status === "Completed") continue;
                await mutateAsyncUpdateDetail({
                    id: d.id,
                    detail: { status: "Completed" },
                    updated_by: currentUserId ?? undefined,
                });
            }
            await mutateAsyncUpdateOrder({
                id: order.id,
                order: { status: "Completed" },
                updated_by: currentUserId ?? undefined,
            });
            showToast(
                "Đã hoàn thành đơn và cập nhật tất cả món thành Xong việc (thợ).",
                "success",
            );
            return true;
        } catch (err: any) {
            showToast("Lỗi: " + err.message, "error");
            return false;
        }
    };

    const handleConfirmCompleteOrder = async () => {
        if (!completingOrder) return;
        const ok = await handleMarkCompletedFromList(completingOrder);
        if (ok) setCompletingOrder(null);
    };

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const rows = await fetchOrdersForExport(filters);
            const data = rows.map((o) => ({
                debt: Math.max(0, Number(o.total_amount) - Number(o.paid_amount || 0)),
                deliveryStatus: getDeliveryStatusLabel(o),
                paymentMethod: getLatestPaymentMethod(o),
                isReturned:
                    o.status === "Delivered" ||
                    o.status === "DeliveredOwing" ||
                    o.status === "Completed",
            })).map((x, idx) => {
                const o = rows[idx];
                return {
                "Mã đơn": o.id,
                "Ngày tạo": new Date(o.created_at).toLocaleDateString("vi-VN"),
                "Khách hàng": o.customer?.name || "Vãng lai",
                SĐT: o.customer?.phone || "",
                "Tổng tiền": o.total_amount,
                "Đã trả": o.paid_amount || 0,
                "Còn nợ": x.debt,
                "Trạng thái": statusLabelMap[o.status] ?? "Đang xử lý",
                "Trạng thái trả đồ": x.deliveryStatus || "",
                "Phương thức thanh toán": x.isReturned && x.debt <= 0 ? x.paymentMethod : "",
            };
            });
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Đơn hàng");
            XLSX.writeFile(
                wb,
                `don-hang-${startDate || "start"}-${endDate || "end"}.xlsx`,
            );
            showToast("Đã xuất Excel", "success");
        } catch (err: any) {
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setExporting(false);
        }
    };

    const selectClass =
        "w-full bg-muted/20 border border-border rounded-md px-3 py-2 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary";

    const toggleSelectForPrint = (orderId: number) => {
        setSelectedForPrint((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    };
    const batchOrders = orders.filter((o) => selectedForPrint.has(o.id));
    const silentBatchReady = isSilentThermalConfigured();

    const handleBatchPrint = async () => {
        if (batchPrinting) return;
        if (!batchOrders.length) {
            showToast("Không có hóa đơn nào để in", "error");
            return;
        }
        const root = batchPrintRootRef.current;
        if (!root) {
            showToast("Không tìm thấy vùng in lô hóa đơn", "error");
            return;
        }
        const invoiceEls = [...root.querySelectorAll(".invoice-print-area")].filter(
            (el): el is HTMLElement => el instanceof HTMLElement,
        );
        if (!invoiceEls.length) {
            showToast("Không có hóa đơn hiển thị để in", "error");
            return;
        }
        setBatchPrinting(true);
        try {
            let successCount = 0;
            let usedBrowserFallback = false;
            const errors: string[] = [];

            for (const [idx, el] of invoiceEls.entries()) {
                const result = await printElementSmart(
                    el,
                    PRINT_TARGET_INVOICE_XP80C,
                );
                if (result.error) {
                    errors.push(`Phiếu ${idx + 1}: ${result.error}`);
                    continue;
                }
                if (result.method === "browser") {
                    usedBrowserFallback = true;
                }
                successCount += 1;

                // Giảm nguy cơ driver bỏ sót job khi đẩy nhiều lệnh liên tiếp.
                await new Promise((resolve) => setTimeout(resolve, 150));
            }

            if (successCount === 0) {
                showToast(errors[0] || "In lô hóa đơn thất bại", "error");
                return;
            }

            if (errors.length > 0) {
                showToast(
                    `Đã in ${successCount}/${invoiceEls.length} hóa đơn. Lỗi: ${errors[0]}`,
                    "error",
                );
                return;
            }

            showToast(
                usedBrowserFallback
                    ? `Đã mở hộp thoại in cho ${successCount} hóa đơn.`
                    : `Đã gửi lệnh in ${successCount} hóa đơn tới máy in.`,
                "success",
            );
        } catch (err: any) {
            showToast(err?.message || "In lô hóa đơn thất bại", "error");
        } finally {
            setBatchPrinting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h4 className="text-lg md:text-xl font-bold text-foreground">
                    Quản lý đơn hàng
                </h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShoppingBag size={16} /> Tổng: {totalOrders} · Trang {page}/
                    {totalPages}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            size={16}
                        />
                        <input
                            type="text"
                            placeholder="Tìm mã đơn, tên hoặc SĐT khách..."
                            className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            type="date"
                            className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-muted-foreground">→</span>
                        <input
                            type="date"
                            className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <select
                            className="bg-card border border-border rounded-md px-4 py-2.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary pr-10 min-w-[160px]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Tất cả trạng thái</option>
                            {statusOptions.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            size={16}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success border border-success/30 rounded-md font-bold text-sm hover:bg-success/20 disabled:opacity-50"
                    >
                        <FileDown size={16} />{" "}
                        {exporting ? "Đang xuất..." : "Xuất Excel"}
                    </button>
                    {selectedForPrint.size > 0 && (
                        <button
                            type="button"
                            onClick={() => setBatchPrintOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary border border-primary/30 rounded-md font-bold text-sm hover:bg-primary/20"
                        >
                            <Printer size={16} /> In phiếu đã chọn (
                            {selectedForPrint.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Orders list */}
            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="vuexy-card h-24 animate-pulse"
                        />
                    ))
                ) : orders.length > 0 ? (
                    <>
                        {orders.map((order) => {
                            const st = getStatusStyle(order.status);
                            const debt =
                                order.total_amount - (order.paid_amount || 0);
                            const isPaid = debt <= 0;
                            const deliveryStatusLabel =
                                getDeliveryStatusLabel(order);
                            const paymentMethodLabel =
                                isPaid && deliveryStatusLabel
                                    ? getLatestPaymentMethod(order)
                                    : "";
                            return (
                                <div
                                    key={order.id}
                                    className="vuexy-card p-4 md:p-5 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() =>
                                        setDetailModalOrderId(order.id)
                                    }
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                                            <label className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center shrink-0 cursor-pointer rounded-lg border-0">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForPrint.has(
                                                        order.id,
                                                    )}
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    onChange={() =>
                                                        toggleSelectForPrint(
                                                            order.id,
                                                        )
                                                    }
                                                    className="w-5 h-5 rounded-md border-2 border-border bg-background text-primary accent-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 transition-colors cursor-pointer"
                                                />
                                                <span className="sr-only">
                                                    Chọn để in phiếu
                                                </span>
                                            </label>
                                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <ShoppingBag size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h6 className="font-bold text-foreground">
                                                        #
                                                        {order.id
                                                            .toString()
                                                            .padStart(5, "0")}
                                                    </h6>
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${st.color}`}
                                                    >
                                                        {st.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground font-medium">
                                                    {order.customer?.name ||
                                                        "Vãng lai"}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-muted-foreground mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar
                                                            size={12}
                                                            className="text-primary"
                                                        />
                                                        {new Date(
                                                            order.created_at,
                                                        ).toLocaleDateString(
                                                            "vi-VN",
                                                        )}
                                                    </span>
                                                </div>
                                                {order.details &&
                                                    order.details.length >
                                                        0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {order.details.map(
                                                                (d) => (
                                                                    <span
                                                                        key={
                                                                            d.id
                                                                        }
                                                                        className="inline-flex flex-wrap items-center gap-1 text-[10px] px-2 py-0.5 bg-muted/30 rounded border border-border text-muted-foreground"
                                                                    >
                                                                        <span>
                                                                            {
                                                                                d.item_name
                                                                            }
                                                                        </span>
                                                                        <span
                                                                            className={`px-1 py-0 rounded text-[9px] font-bold ${orderDetailStatusBadgeClass(d.status)}`}
                                                                        >
                                                                            {orderDetailStatusLabelVi(
                                                                                d.status,
                                                                            )}
                                                                        </span>
                                                                        {d
                                                                            .tailor
                                                                            ?.name && (
                                                                            <span className="text-primary">
                                                                                ·{" "}
                                                                                {
                                                                                    d
                                                                                        .tailor
                                                                                        .name
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0">
                                            <div className="text-right flex-1 sm:flex-none">
                                                <p className="text-base font-black text-foreground">
                                                    {new Intl.NumberFormat(
                                                        "vi-VN",
                                                        {
                                                            style: "currency",
                                                            currency: "VND",
                                                        },
                                                    ).format(
                                                        order.total_amount,
                                                    )}
                                                </p>
                                                {debt > 0 && (
                                                    <p className="text-[10px] font-bold text-warning">
                                                        Nợ:{" "}
                                                        {new Intl.NumberFormat(
                                                            "vi-VN",
                                                        ).format(debt)}
                                                        đ
                                                    </p>
                                                )}
                                                {isPaid && (
                                                    <p className="text-[10px] font-bold text-success">
                                                        Đã thanh toán
                                                    </p>
                                                )}
                                                {deliveryStatusLabel && (
                                                    <p className="text-[10px] font-bold text-primary">
                                                        {deliveryStatusLabel}
                                                    </p>
                                                )}
                                                {paymentMethodLabel && (
                                                    <p className="text-[10px] font-bold text-info">
                                                        PTTT: {paymentMethodLabel}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-1.5 shrink-0 max-w-full">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetailModalOrderId(
                                                            order.id,
                                                        );
                                                    }}
                                                    className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                                                    title="Chi tiết đơn và danh sách mặt hàng"
                                                >
                                                    <ListOrdered size={16} />
                                                </button>
                                                {debt > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPayingOrder(order);
                                                            setPayForm({
                                                                amount: String(
                                                                    debt,
                                                                ),
                                                                method: "Cash",
                                                            });
                                                        }}
                                                        disabled={
                                                            isPendingUpdateOrder
                                                        }
                                                        className="p-2 rounded-md text-success hover:bg-success/10 transition-colors disabled:opacity-40 shrink-0"
                                                        title="Ghi nhận thanh toán (chỉ tiền)"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                )}
                                                {(order.status === "Ready" ||
                                                    order.status ===
                                                        "Paid") && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeliveringOrder(
                                                                order,
                                                            );
                                                        }}
                                                        disabled={
                                                            isPendingUpdateOrder
                                                        }
                                                        className="p-2 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 shrink-0"
                                                        title="Trả đồ cho khách (xác nhận)"
                                                    >
                                                        <PackageCheck size={16} />
                                                    </button>
                                                )}
                                                {order.status !==
                                                    "Completed" && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (debt > 0) return;
                                                            setCompletingOrder(
                                                                order,
                                                            );
                                                        }}
                                                        disabled={
                                                            debt > 0 ||
                                                            isPendingUpdateOrder ||
                                                            isPendingUpdateDetail
                                                        }
                                                        className="p-2 rounded-md text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-40 shrink-0"
                                                        title={
                                                            debt > 0
                                                                ? "Thu đủ tiền trước khi hoàn thành đơn"
                                                                : "Hoàn thành đơn (xác nhận)"
                                                        }
                                                    >
                                                        <CheckCircle2
                                                            size={16}
                                                        />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setInvoiceOrder(order);
                                                    }}
                                                    className="p-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
                                                    title="In phiếu"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                {order.details &&
                                                    order.details.length >
                                                        0 && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLabelOrder(
                                                                    order,
                                                                );
                                                                setLabelLineIndices(
                                                                    null,
                                                                );
                                                            }}
                                                            className="p-2 rounded-md text-info hover:bg-info/10 transition-colors"
                                                            title="In tem barcode từng món"
                                                        >
                                                            <Printer
                                                                size={16}
                                                                className="scale-90"
                                                            />
                                                        </button>
                                                    )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(order);
                                                    }}
                                                    className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingOrder(order);
                                                    }}
                                                    className="p-2 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="py-4 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || isFetching}
                                className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {page}/{totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={page >= totalPages || isFetching}
                                className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                            {isFetching && (
                                <Loader2
                                    className="animate-spin text-primary"
                                    size={18}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="vuexy-card p-16 text-center flex flex-col items-center gap-3 bg-transparent border-2 border-dashed border-border shadow-none">
                        <ShoppingBag
                            size={40}
                            className="text-muted-foreground opacity-20"
                        />
                        <p className="text-muted-foreground italic">
                            Không tìm thấy đơn hàng nào.
                        </p>
                    </div>
                )}
            </div>

            {/* Edit Order Modal */}
            <Modal
                isOpen={!!editingOrder}
                onClose={() => {
                    setEditingOrder(null);
                    setDeletingDetailId(null);
                }}
                title={`Cập nhật đơn #${editingOrder?.id}`}
                maxWidth="max-w-4xl"
            >
                <OrderLogSection orderId={editingOrder?.id ?? null} />
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            Trạng thái đơn hàng
                        </label>
                        <div className="relative">
                            <select
                                name="order-status"
                                className={selectClass}
                                defaultValue={editingOrder?.status || "New"}
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

                    {editingOrder?.details &&
                        editingOrder.details.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase">
                                    Chi tiết sản phẩm (
                                    {editingOrder.details.length})
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-snug">
                                    Giao từng món: chọn &quot;Đã giao món&quot;
                                    hoặc &quot;Đã giao — nợ món&quot; khi khách chỉ
                                    nhận / chỉ trả trước một phần đồ. Tiền vẫn ghi
                                    ở nút thanh toán đơn.
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
                                                {editingOrder.details.map(
                                                    (d) => {
                                                        const edit =
                                                            detailEdits[d.id];
                                                        if (!edit) return null;
                                                        return (
                                                            <tr
                                                                key={d.id}
                                                                className="border-b border-border/50 last:border-0 hover:bg-muted/10"
                                                            >
                                                                <td className="p-1.5">
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            edit.item_name
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setDetailEdit(
                                                                                d.id,
                                                                                "item_name",
                                                                                e
                                                                                    .target
                                                                                    .value,
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
                                                                        type="number"
                                                                        min="0"
                                                                        value={
                                                                            edit.unit_price
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setDetailEdit(
                                                                                d.id,
                                                                                "unit_price",
                                                                                e
                                                                                    .target
                                                                                    .value,
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
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setDetailEdit(
                                                                                d.id,
                                                                                "description",
                                                                                e
                                                                                    .target
                                                                                    .value,
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
                                                                            value={
                                                                                edit.status
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setDetailEdit(
                                                                                    d.id,
                                                                                    "status",
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className={
                                                                                selectClass +
                                                                                " min-w-0"
                                                                            }
                                                                        >
                                                                            {orderDetailStatusSelectOptions.map(
                                                                                (
                                                                                    s,
                                                                                ) => (
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
                                                                            size={
                                                                                12
                                                                            }
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-1.5">
                                                                    <div className="relative">
                                                                        <select
                                                                            value={
                                                                                edit.assigned_tailor_id
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setDetailEdit(
                                                                                    d.id,
                                                                                    "assigned_tailor_id",
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className={
                                                                                selectClass +
                                                                                " min-w-0"
                                                                            }
                                                                        >
                                                                            <option value="">
                                                                                Chưa
                                                                                phân
                                                                                công
                                                                            </option>
                                                                            {tailors.map(
                                                                                (
                                                                                    t: User & {
                                                                                        role: Role | null;
                                                                                    },
                                                                                ) => (
                                                                                    <option
                                                                                        key={String(
                                                                                            t.id,
                                                                                        )}
                                                                                        value={String(
                                                                                            t.id,
                                                                                        )}
                                                                                    >
                                                                                        {
                                                                                            t.name
                                                                                        }
                                                                                    </option>
                                                                                ),
                                                                            )}
                                                                        </select>
                                                                        <ChevronDown
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                                                            size={
                                                                                12
                                                                            }
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDeletingDetailId(
                                                                                d.id,
                                                                            )
                                                                        }
                                                                        className="p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                                                                        title="Xóa dòng"
                                                                    >
                                                                        <Trash2
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
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
                                                    type="number"
                                                    min="0"
                                                    value={row.price}
                                                    onChange={(e) =>
                                                        updateNewItem(
                                                            idx,
                                                            "price",
                                                            e.target.value,
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
                                                    value={
                                                        row.assigned_tailor_id
                                                    }
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
                                                    {tailors.map(
                                                        (
                                                            t: User & {
                                                                role: Role | null;
                                                            },
                                                        ) => (
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
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeNewItem(idx)
                                                    }
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
                            onClick={() => {
                                setEditingOrder(null);
                                setDeletingDetailId(null);
                            }}
                            className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={
                                isPendingUpdateOrder ||
                                isPendingUpdateDetail ||
                                isPendingAddOrderDetails
                            }
                            className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
                        >
                            {isPendingUpdateOrder ||
                            isPendingUpdateDetail ||
                            isPendingAddOrderDetails
                                ? "Đang lưu..."
                                : "Cập nhật"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm delete order detail */}
            <Modal
                isOpen={deletingDetailId !== null}
                onClose={() => setDeletingDetailId(null)}
                title="Xóa dòng sản phẩm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Bạn có chắc muốn xóa dòng sản phẩm này? Tổng tiền đơn sẽ
                        được cập nhật trừ đi giá trị dòng.
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setDeletingDetailId(null)}
                            className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                deletingDetailId != null &&
                                handleDeleteDetail(deletingDetailId)
                            }
                            disabled={isPendingDeleteDetail}
                            className="flex-1 bg-danger text-white py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
                        >
                            {isPendingDeleteDetail ? "Đang xóa..." : "Xóa"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={!!payingOrder}
                onClose={() => setPayingOrder(null)}
                title={`Ghi nhận thanh toán · Đơn #${payingOrder?.id}`}
            >
                <form onSubmit={handlePayment} className="space-y-5">
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
                            <span className="text-muted-foreground">
                                Tổng cộng
                            </span>
                            <span className="font-bold">
                                {paymentModalPreview &&
                                    new Intl.NumberFormat("vi-VN", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(paymentModalPreview.total)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Đã thu đến nay
                            </span>
                            <span className="font-bold text-success">
                                {paymentModalPreview &&
                                    new Intl.NumberFormat("vi-VN", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(paymentModalPreview.paid)}
                            </span>
                        </div>
                        {paymentModalPreview &&
                            paymentModalPreview.thisPayment > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Sau khi ghi nhận lần này
                                    </span>
                                    <span className="font-bold text-success">
                                        {new Intl.NumberFormat("vi-VN", {
                                            style: "currency",
                                            currency: "VND",
                                        }).format(
                                            paymentModalPreview.paidAfter,
                                        )}
                                    </span>
                                </div>
                            )}
                        <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                            <span className="text-primary">
                                {paymentModalPreview &&
                                paymentModalPreview.thisPayment > 0
                                    ? "Còn lại (dự kiến)"
                                    : "Còn lại"}
                            </span>
                            <span className="text-primary">
                                {paymentModalPreview &&
                                    new Intl.NumberFormat("vi-VN", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(
                                        paymentModalPreview.thisPayment > 0
                                            ? paymentModalPreview.remainingAfter
                                            : paymentModalPreview.currentDebt,
                                    )}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            Số tiền thu
                        </label>
                        <input
                            required
                            type="number"
                            min="1"
                            className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={payForm.amount}
                            onChange={(e) =>
                                setPayForm({
                                    ...payForm,
                                    amount: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            Phương thức
                        </label>
                        <select
                            className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary"
                            value={payForm.method}
                            onChange={(e) =>
                                setPayForm({
                                    ...payForm,
                                    method: e.target.value as
                                        | "Cash"
                                        | "Card"
                                        | "Transfer",
                                })
                            }
                        >
                            <option value="Cash">Tiền mặt</option>
                            <option value="Card">Thẻ</option>
                            <option value="Transfer">Chuyển khoản</option>
                        </select>
                    </div>
                    <div className="flex gap-4 mt-8">
                        <button
                            type="button"
                            onClick={() => setPayingOrder(null)}
                            className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isPendingProcessPayment}
                            className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
                        >
                            {isPendingProcessPayment
                                ? "Đang xử lý..."
                                : "Ghi nhận thanh toán"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Xác nhận trả đồ (danh sách đơn) */}
            <Modal
                isOpen={!!deliveringOrder}
                onClose={() => setDeliveringOrder(null)}
                title={
                    deliveringOrder
                        ? `Xác nhận trả đồ · Đơn #${String(deliveringOrder.id).padStart(5, "0")}`
                        : "Xác nhận trả đồ"
                }
            >
                <div className="space-y-4">
                    {deliveringOrder && (
                        <>
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-bold text-foreground">
                                        Đơn #
                                        {String(deliveringOrder.id).padStart(
                                            5,
                                            "0",
                                        )}
                                    </span>
                                    <span className="text-sm font-bold text-foreground shrink-0">
                                        {new Intl.NumberFormat("vi-VN", {
                                            style: "currency",
                                            currency: "VND",
                                        }).format(deliveringOrder.total_amount)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground flex-wrap">
                                    <UserCheck
                                        size={14}
                                        className="shrink-0 text-primary"
                                    />
                                    <span className="font-medium">
                                        {deliveringOrder.customer?.name ||
                                            "Vãng lai"}
                                    </span>
                                    {deliveringOrder.customer?.phone && (
                                        <span className="text-muted-foreground">
                                            — {deliveringOrder.customer.phone}
                                        </span>
                                    )}
                                </div>
                                {deliveringOrder.details &&
                                    deliveringOrder.details.length > 0 && (
                                        <div className="border-t border-primary/10 pt-3 space-y-1.5">
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase">
                                                Món trong đơn
                                            </p>
                                            <ul className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 text-xs">
                                                {deliveringOrder.details.map(
                                                    (d) => (
                                                        <li
                                                            key={d.id}
                                                            className="flex justify-between gap-2 text-foreground"
                                                        >
                                                            <span className="min-w-0 truncate">
                                                                {d.item_name}
                                                            </span>
                                                            <span className="text-muted-foreground shrink-0">
                                                                {new Intl.NumberFormat(
                                                                    "vi-VN",
                                                                ).format(
                                                                    d.unit_price,
                                                                )}
                                                                đ
                                                            </span>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                            {deliveringDebt > 0 && (
                                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                                    <p className="text-xs font-bold text-warning leading-relaxed">
                                        Còn nợ{" "}
                                        {new Intl.NumberFormat("vi-VN", {
                                            style: "currency",
                                            currency: "VND",
                                        }).format(deliveringDebt)}
                                        . Sau khi xác nhận, trạng thái đơn:{" "}
                                        <span className="text-foreground">
                                            {resolveStatusWhenMarkingDelivered(
                                                deliveringOrder,
                                            ) === "DeliveredOwing"
                                                ? "Trả thiếu tiền."
                                                : "Đã trả đồ."}
                                        </span>
                                    </p>
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Xác nhận đã giao đồ cho khách? Hệ thống ghi nhận
                                thời điểm trả đồ và cập nhật trạng thái đơn.
                            </p>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setDeliveringOrder(null)}
                                    disabled={isPendingUpdateOrder}
                                    className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void handleConfirmDeliverFromList()
                                    }
                                    disabled={isPendingUpdateOrder}
                                    className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPendingUpdateOrder ? (
                                        "Đang xử lý..."
                                    ) : (
                                        <>
                                            <PackageCheck size={16} />
                                            Xác nhận trả đồ
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Xác nhận hoàn thành đơn */}
            <Modal
                isOpen={!!completingOrder}
                onClose={() => setCompletingOrder(null)}
                title={
                    completingOrder
                        ? `Hoàn thành đơn #${String(completingOrder.id).padStart(5, "0")}`
                        : "Hoàn thành đơn"
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Bạn xác nhận <strong>hoàn thành đơn</strong> này? Hệ
                        thống sẽ đặt <strong>tất cả món</strong> trong đơn sang
                        trạng thái <strong>Xong việc (thợ)</strong> và đơn sang{" "}
                        <strong>Hoàn thành</strong>.{" "}
                        <span className="text-foreground">
                            Không thay đổi thanh toán.
                        </span>
                    </p>
                    {completingOrder &&
                        (completingOrder.details?.length ?? 0) > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                                {completingOrder.details?.length ?? 0} dòng món
                                trong đơn.
                            </p>
                        )}
                    {completingDebt > 0 && (
                        <p className="text-sm font-bold text-warning leading-relaxed">
                            Đơn còn nợ{" "}
                            {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                            }).format(completingDebt)}
                            . Thu đủ tiền trước khi hoàn thành đơn.
                        </p>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setCompletingOrder(null)}
                            disabled={
                                isPendingUpdateOrder ||
                                isPendingUpdateDetail
                            }
                            className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleConfirmCompleteOrder()}
                            disabled={
                                completingDebt > 0 ||
                                isPendingUpdateOrder ||
                                isPendingUpdateDetail
                            }
                            className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
                        >
                            {isPendingUpdateOrder || isPendingUpdateDetail
                                ? "Đang xử lý..."
                                : "Xác nhận hoàn thành"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={!!deletingOrder}
                onClose={() => setDeletingOrder(null)}
                title="Xóa đơn hàng"
            >
                <div className="space-y-6">
                    <p className="text-muted-foreground text-sm">
                        Bạn có chắc chắn muốn xóa đơn hàng{" "}
                        <span className="font-bold text-foreground">
                            #{deletingOrder?.id}
                        </span>
                        ?
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setDeletingOrder(null)}
                            className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border"
                        >
                            Giữ lại
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isPendingDeleteOrder}
                            className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
                        >
                            {isPendingDeleteOrder
                                ? "Đang xóa..."
                                : "Xóa vĩnh viễn"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Invoice Print Modal (single) – 1 đơn = 1 trang khi in */}
            <Modal
                isOpen={!!invoiceOrder}
                onClose={() => setInvoiceOrder(null)}
                title={
                    invoiceOrder
                        ? `Phiếu thanh toán #${invoiceOrder.id.toString().padStart(5, "0")}`
                        : "Phiếu thanh toán"
                }
                maxWidth="max-w-2xl"
            >
                <div className="print:block pb-4">
                    {invoiceOrder && (
                        <InvoicePrint
                            order={invoiceOrder}
                            onClose={() => setInvoiceOrder(null)}
                        />
                    )}
                </div>
            </Modal>

            {/* Batch Print Modal (many invoices) */}
            <Modal
                isOpen={batchPrintOpen}
                onClose={() => setBatchPrintOpen(false)}
                title={`In ${batchOrders.length} phiếu thanh toán`}
                maxWidth="max-w-2xl"
            >
                <div className="space-y-4 print:space-y-0 pb-4">
                    <div className="non-print space-y-3 shrink-0">
                        <p className="text-sm text-muted-foreground">
                            Bạn đã chọn{" "}
                            <strong>{batchOrders.length} đơn</strong>. In sẽ tạo{" "}
                            <strong>{batchOrders.length} lần cắt giấy</strong>{" "}
                            trên máy nhiệt (mỗi đơn một khổ 80mm, ví dụ{" "}
                            <strong>XP-80C</strong>). Chỉ cần một phiếu? Đóng và
                            mở in từ từng đơn.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Đơn sẽ in:{" "}
                            {batchOrders
                                .map(
                                    (o) =>
                                        `#${o.id.toString().padStart(5, "0")}`,
                                )
                                .join(", ")}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setBatchPrintOpen(false)}
                                className="px-4 py-2 border border-border rounded-md font-bold text-sm hover:bg-muted/50"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={handleBatchPrint}
                                disabled={batchPrinting || batchOrders.length === 0}
                                className="px-4 py-2 bg-primary text-white rounded-md font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {batchPrinting
                                    ? "Đang in..."
                                    : silentBatchReady
                                      ? `In XP-80C ⚡: ${batchOrders.length} phiếu`
                                      : `In XP-80C: ${batchOrders.length} phiếu`}
                            </button>
                        </div>
                    </div>
                    <div
                        ref={batchPrintRootRef}
                        className="print:block space-y-6 print:space-y-0"
                    >
                        {batchOrders.map((order) => (
                            <div
                                key={order.id}
                                data-print-target={PRINT_TARGET_INVOICE_XP80C}
                                className="invoice-print-area invoice-xp80c invoice-cs-receipt invoice-page bg-white text-black m-0 max-w-xl p-0 print:max-w-none"
                            >
                                <div className="invoice-xp80c-body min-w-0">
                                    <InvoicePrintContent order={order} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Item labels print modal from Orders page (stackOnTop: mở từ chi tiết đơn) */}
            <Modal
                isOpen={Boolean(labelOrder?.details?.length)}
                stackOnTop
                onClose={() => {
                    setLabelOrder(null);
                    setLabelLineIndices(null);
                }}
                title={
                    labelOrder
                        ? labelLineIndices?.length === 1
                            ? `In tem 1 món · Đơn #${labelOrder.id.toString().padStart(5, "0")}`
                            : `In tem barcode đơn #${labelOrder.id.toString().padStart(5, "0")}`
                        : "In tem barcode"
                }
                maxWidth="max-w-lg"
            >
                {labelOrder?.details?.length ? (
                    <ItemLabelsPrint
                        orderId={labelOrder.id}
                        transactionCode={labelOrder.transaction_code}
                        items={labelOrder.details.map((d) => ({
                            name: d.item_name,
                            description: d.description || undefined,
                        }))}
                        lineIndices1Based={
                            labelLineIndices?.length
                                ? labelLineIndices
                                : undefined
                        }
                        customerName={labelOrder.customer?.name ?? null}
                        customerAddress={labelOrder.customer?.address ?? null}
                        returnTime={labelOrder.return_time ?? null}
                        onClose={() => {
                            setLabelOrder(null);
                            setLabelLineIndices(null);
                        }}
                    />
                ) : null}
            </Modal>

            {/* Order detail view (read-only, full info) */}
            <OrderDetailModal
                isOpen={detailModalOrderId != null}
                onClose={() => setDetailModalOrderId(null)}
                orderId={detailModalOrderId}
                onPrintItemBarcode={(order, lineIndex1Based) => {
                    setLabelOrder(order);
                    setLabelLineIndices([lineIndex1Based]);
                }}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}
        </div>
    );
}
