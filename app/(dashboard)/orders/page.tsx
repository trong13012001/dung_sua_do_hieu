"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileDown, Loader2, Printer, Search, ShoppingBag } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
    useOrdersPage,
    useUpdateOrder,
    useUpdateOrderDetail,
    useDeleteOrder,
    EXPORT_MAX_ORDERS,
    fetchOrdersForExport,
    type OrdersFilters,
} from "@/api/orders";
import { useProcessPayment } from "@/api/payments";
import { useEmployees } from "@/api/users";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGetOrder } from "@/hooks/order/useGetOrder";
import { useDebounce } from "@/hooks/useDebounce";
import { Order, Payment } from "@/lib/types";
import { validateNumber } from "@/lib/validation";
import { decodeBarcode } from "@/lib/barcode";
import { printElementSmart } from "@/lib/printSmart";
import { PRINT_TARGET_INVOICE_XP80C } from "@/lib/printTargets";
import { isSilentThermalConfigured } from "@/lib/print/thermalPrint";
import { resolveStatusWhenMarkingDelivered } from "@/lib/orderStatusUi";
import { errorMessage } from "@/lib/utils";
import { formatNumber, formatVnd } from "@/lib/format";
import { Pagination } from "@/components/ui/Pagination";
import { OrderDetailModal } from "@/components/ui/OrderDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { OrderListSkeleton } from "@/components/ui/loading-skeletons";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { EditOrderDialog } from "@/components/orders/EditOrderDialog";
import { DeliverOrderDialog } from "@/components/orders/DeliverOrderDialog";
import { InvoicePrintDialog, ItemLabelsPrintDialog } from "@/components/orders/OrderPrintDialogs";
import { PaymentForm, type PaymentFormData } from "@/components/orders/PaymentForm";
import { ORDER_STATUS_OPTIONS } from "@/components/orders/orderStatusOptions";
import { OrderRow, type OrderRowActions } from "./_components/OrderRow";
import { BatchPrintDialog } from "./_components/BatchPrintDialog";
import {
    ORDER_STATUS_EXPORT_LABEL,
    getDeliveryStatusLabel,
    getLatestPaymentMethod,
} from "./_components/orderListLabels";

/** Radix Select không nhận value rỗng. */
const ALL_STATUSES = "__all__";

/** Ô tìm kiếm nhận cả mã quét từ barcode (hoá đơn / tem) → đổi về mã giao dịch hoặc mã đơn. */
function searchTermFromInput(raw: string): string | undefined {
    const kw = raw.trim();
    if (!kw) return undefined;
    const parsed = decodeBarcode(kw);
    if (parsed?.kind === "invoice" || parsed?.kind === "item") return parsed.transactionCode;
    if (parsed?.kind === "legacy_invoice") return String(parsed.orderId);
    return kw;
}

export default function OrdersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentUserId = useCurrentUserId();
    const { data: employees } = useEmployees();
    const { mutateAsync: updateOrder, isPending: isUpdatingOrder } = useUpdateOrder();
    const { mutateAsync: updateDetail, isPending: isUpdatingDetail } = useUpdateOrderDetail();
    const { mutateAsync: deleteOrder, isPending: isDeletingOrder } = useDeleteOrder();
    const { mutateAsync: processPayment, isPending: isProcessingPayment } = useProcessPayment();

    // Bộ lọc — mọi thay đổi đưa về trang 1 ngay trong handler.
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Hộp thoại: cờ mở tách khỏi dữ liệu để nội dung giữ nguyên lúc animation đóng.
    const [editOpen, setEditOpen] = useState(false);
    const [editKey, setEditKey] = useState(0);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
    const [deliverOpen, setDeliverOpen] = useState(false);
    const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null);
    const [payOpen, setPayOpen] = useState(false);
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    const [payFlowBusy, setPayFlowBusy] = useState(false);
    const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
    const [detailModalOrderId, setDetailModalOrderId] = useState<number | string | null>(null);
    const [labelOrder, setLabelOrder] = useState<Order | null>(null);
    /** null = in tất cả món; mảng STT 1-based = chỉ các dòng đó (barcode đúng vị trí trong đơn). */
    const [labelLineIndices, setLabelLineIndices] = useState<number[] | null>(null);
    const [selectedForPrint, setSelectedForPrint] = useState<Set<number>>(() => new Set());
    const [batchPrintOpen, setBatchPrintOpen] = useState(false);
    const [batchPrinting, setBatchPrinting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const batchPrintRootRef = useRef<HTMLDivElement>(null);

    const filters = useMemo<OrdersFilters>(
        () => ({
            status: statusFilter === ALL_STATUSES ? undefined : statusFilter,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            search: searchTermFromInput(debouncedSearch),
        }),
        [statusFilter, startDate, endDate, debouncedSearch],
    );
    const { data, isLoading, isFetching } = useOrdersPage(filters, page, pageSize);
    const orders = useMemo(() => data?.items ?? [], [data]);
    const totalOrders = data?.total ?? 0;

    const tailors = useMemo(() => (employees ?? []).filter((e) => e.role?.name === "Thợ may"), [employees]);

    const openEdit = useCallback((order: Order) => {
        setEditingOrder(order);
        setEditKey((k) => k + 1);
        setEditOpen(true);
    }, []);

    // `/orders?editOrderId=…` (từ POS) mở thẳng form sửa đơn rồi xoá tham số khỏi URL.
    const deepLinkEditIdRaw = searchParams.get("editOrderId");
    const deepLinkEditId = deepLinkEditIdRaw ? Number(deepLinkEditIdRaw) : null;
    const validDeepLink = deepLinkEditId != null && Number.isFinite(deepLinkEditId) && deepLinkEditId > 0;
    const { data: deepLinkedOrder } = useGetOrder(validDeepLink ? deepLinkEditId : null);
    const deepLinkHandledRef = useRef<string | null>(null);
    useEffect(() => {
        if (!deepLinkEditIdRaw) {
            deepLinkHandledRef.current = null;
            return;
        }
        if (deepLinkHandledRef.current === deepLinkEditIdRaw || !validDeepLink) return;
        const target = orders.find((o) => o.id === deepLinkEditId) ?? deepLinkedOrder ?? null;
        if (!target) return;
        openEdit(target);
        deepLinkHandledRef.current = deepLinkEditIdRaw;
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("editOrderId");
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `/orders?${nextQuery}` : "/orders");
    }, [deepLinkEditId, deepLinkEditIdRaw, validDeepLink, deepLinkedOrder, orders, router, searchParams, openEdit]);

    const rowActions = useMemo<OrderRowActions>(
        () => ({
            onOpen: (id) => setDetailModalOrderId(id),
            onToggleSelect: (id) =>
                setSelectedForPrint((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                }),
            onPay: (order) => {
                setPayingOrder(order);
                setPayOpen(true);
            },
            onDeliver: (order) => {
                setDeliveringOrder(order);
                setDeliverOpen(true);
            },
            onComplete: (order) => {
                setCompletingOrder(order);
                setCompleteOpen(true);
            },
            onPrintInvoice: (order) => setInvoiceOrder(order),
            onPrintLabels: (order) => {
                setLabelOrder(order);
                setLabelLineIndices(null);
            },
            onEdit: openEdit,
            onDelete: (order) => {
                setDeletingOrder(order);
                setDeleteOpen(true);
            },
        }),
        [openEdit],
    );

    const handleDelete = async () => {
        if (!deletingOrder) return;
        try {
            await deleteOrder({ id: deletingOrder.id, updated_by: currentUserId ?? undefined });
            setDeleteOpen(false);
            toast.success("Xóa đơn hàng thành công");
        } catch (err) {
            toast.error("Lỗi: " + errorMessage(err));
        }
    };

    const handlePayment = async (form: PaymentFormData) => {
        if (!payingOrder || payFlowBusy) return;
        const debt = Math.max(0, payingOrder.total_amount - (payingOrder.paid_amount ?? 0));
        const runOne = (amt: number, method: Payment["payment_method"]) =>
            processPayment({
                order_id: payingOrder.id,
                amount: amt,
                payment_method: method,
                updated_by: currentUserId ?? undefined,
            });

        if (form.splitPay) {
            const err =
                validateNumber(form.amount, { min: 1, fieldName: "Số tiền khoản 1" }) ||
                validateNumber(form.amount2, { min: 1, fieldName: "Số tiền khoản 2" });
            if (err) {
                toast.error(err);
                return;
            }
            if (Number(form.amount) + Number(form.amount2) > debt + 0.01) {
                toast.error(`Tổng hai khoản không được vượt còn lại (${formatNumber(debt)}đ).`);
                return;
            }
        } else {
            const err = validateNumber(form.amount, { min: 1, fieldName: "Số tiền thanh toán" });
            if (err) {
                toast.error(err);
                return;
            }
        }

        setPayFlowBusy(true);
        try {
            await runOne(Number(form.amount), form.method);
            if (form.splitPay) await runOne(Number(form.amount2), form.method2);
            setPayOpen(false);
            toast.success("Đã ghi nhận thanh toán.");
        } catch (err) {
            toast.error("Lỗi: " + errorMessage(err));
        } finally {
            setPayFlowBusy(false);
        }
    };

    const handleConfirmDeliver = async () => {
        if (!deliveringOrder) return;
        try {
            const status = resolveStatusWhenMarkingDelivered(deliveringOrder);
            await updateOrder({
                id: deliveringOrder.id,
                order: { status, return_time: new Date().toISOString() },
                updated_by: currentUserId ?? undefined,
            });
            setDeliverOpen(false);
            toast.success(
                status === "DeliveredOwing"
                    ? "Đã ghi nhận trả đồ — Trả thiếu tiền (còn nợ)."
                    : "Đã ghi nhận trả đồ.",
            );
        } catch (err) {
            toast.error("Lỗi: " + errorMessage(err));
        }
    };

    const completingDebt = completingOrder ? completingOrder.total_amount - (completingOrder.paid_amount ?? 0) : 0;

    const handleConfirmComplete = async () => {
        const order = completingOrder;
        if (!order || order.status === "Completed") return;
        if (completingDebt > 0) {
            toast.error("Chỉ hoàn thành đơn khi đã thu đủ tiền (còn nợ trên đơn).");
            return;
        }
        try {
            for (const d of order.details ?? []) {
                if (d.status === "Completed") continue;
                await updateDetail({
                    id: d.id,
                    detail: { status: "Completed" },
                    updated_by: currentUserId ?? undefined,
                });
            }
            await updateOrder({
                id: order.id,
                order: { status: "Completed" },
                updated_by: currentUserId ?? undefined,
            });
            setCompleteOpen(false);
            toast.success("Đã hoàn thành đơn và cập nhật tất cả món thành Xong việc (thợ).");
        } catch (err) {
            toast.error("Lỗi: " + errorMessage(err));
        }
    };

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const rows = await fetchOrdersForExport(filters);
            const sheet = rows.map((o) => {
                const debt = Math.max(0, Number(o.total_amount) - Number(o.paid_amount || 0));
                const isReturned =
                    o.status === "Delivered" || o.status === "DeliveredOwing" || o.status === "Completed";
                return {
                    "Mã đơn": o.id,
                    "Ngày tạo": new Date(o.created_at).toLocaleDateString("vi-VN"),
                    "Khách hàng": o.customer?.name || "Vãng lai",
                    SĐT: o.customer?.phone || "",
                    "Tổng tiền": o.total_amount,
                    "Đã trả": o.paid_amount || 0,
                    "Còn nợ": debt,
                    "Trạng thái": ORDER_STATUS_EXPORT_LABEL[o.status] ?? "Đang xử lý",
                    "Trạng thái trả đồ": getDeliveryStatusLabel(o) || "",
                    "Phương thức thanh toán": isReturned && debt <= 0 ? getLatestPaymentMethod(o) : "",
                };
            });
            const ws = XLSX.utils.json_to_sheet(sheet);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Đơn hàng");
            XLSX.writeFile(wb, `don-hang-${startDate || "start"}-${endDate || "end"}.xlsx`);
            toast.success(
                rows.length >= EXPORT_MAX_ORDERS
                    ? `Đã xuất ${rows.length} đơn (chạm trần ${EXPORT_MAX_ORDERS} đơn/lần — lọc theo khoảng ngày để xuất phần còn lại)`
                    : `Đã xuất Excel (${rows.length} đơn)`,
            );
        } catch (err) {
            toast.error("Lỗi: " + errorMessage(err));
        } finally {
            setExporting(false);
        }
    };

    const batchOrders = useMemo(() => orders.filter((o) => selectedForPrint.has(o.id)), [orders, selectedForPrint]);

    const handleBatchPrint = async () => {
        if (batchPrinting) return;
        if (!batchOrders.length) {
            toast.error("Không có hóa đơn nào để in");
            return;
        }
        const root = batchPrintRootRef.current;
        if (!root) {
            toast.error("Không tìm thấy vùng in lô hóa đơn");
            return;
        }
        const invoiceEls = [...root.querySelectorAll(".invoice-print-area")].filter(
            (el): el is HTMLElement => el instanceof HTMLElement,
        );
        if (!invoiceEls.length) {
            toast.error("Không có hóa đơn hiển thị để in");
            return;
        }
        setBatchPrinting(true);
        try {
            let successCount = 0;
            let usedBrowserFallback = false;
            const errors: string[] = [];
            for (const [idx, el] of invoiceEls.entries()) {
                const result = await printElementSmart(el, PRINT_TARGET_INVOICE_XP80C);
                if (result.error) {
                    errors.push(`Phiếu ${idx + 1}: ${result.error}`);
                    continue;
                }
                if (result.method === "browser") usedBrowserFallback = true;
                successCount += 1;
                // Giảm nguy cơ driver bỏ sót job khi đẩy nhiều lệnh liên tiếp.
                await new Promise((resolve) => setTimeout(resolve, 150));
            }
            if (successCount === 0) {
                toast.error(errors[0] || "In lô hóa đơn thất bại");
            } else if (errors.length > 0) {
                toast.error(`Đã in ${successCount}/${invoiceEls.length} hóa đơn. Lỗi: ${errors[0]}`);
            } else {
                toast.success(
                    usedBrowserFallback
                        ? `Đã mở hộp thoại in cho ${successCount} hóa đơn.`
                        : `Đã gửi lệnh in ${successCount} hóa đơn tới máy in.`,
                );
            }
        } catch (err) {
            toast.error(errorMessage(err) || "In lô hóa đơn thất bại");
        } finally {
            setBatchPrinting(false);
        }
    };

    const rowBusy = isUpdatingOrder || isUpdatingDetail;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Quản lý đơn hàng"
                actions={
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShoppingBag size={16} /> Tổng: {totalOrders} đơn
                    </span>
                }
            />

            {/* Bộ lọc */}
            <div className="flex flex-wrap items-end gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={16}
                    />
                    <Input
                        type="search"
                        placeholder="Tìm mã đơn, tên hoặc SĐT khách..."
                        className="h-10 bg-card pl-10"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        aria-label="Từ ngày"
                        className="h-10 w-auto bg-card"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setPage(1);
                        }}
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                        type="date"
                        aria-label="Đến ngày"
                        className="h-10 w-auto bg-card"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="h-10 min-w-[170px] bg-card" aria-label="Lọc theo trạng thái">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_STATUSES}>Tất cả trạng thái</SelectItem>
                        {ORDER_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                                {s.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="h-10 border-success/30 bg-success/10 text-success hover:bg-success/20 hover:text-success"
                >
                    <FileDown /> {exporting ? "Đang xuất..." : "Xuất Excel"}
                </Button>
                {selectedForPrint.size > 0 && (
                    <Button
                        variant="outline"
                        onClick={() => setBatchPrintOpen(true)}
                        className="h-10 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    >
                        <Printer /> In phiếu đã chọn ({selectedForPrint.size})
                    </Button>
                )}
            </div>

            {/* Danh sách */}
            <div className="space-y-3">
                {isLoading ? (
                    <OrderListSkeleton rows={6} withCheckbox />
                ) : orders.length > 0 ? (
                    <>
                        {orders.map((order) => (
                            <OrderRow
                                key={order.id}
                                order={order}
                                selected={selectedForPrint.has(order.id)}
                                busy={rowBusy}
                                actions={rowActions}
                            />
                        ))}
                        <div className="flex items-center justify-center gap-3 py-4">
                            <Pagination
                                page={page}
                                totalCount={totalOrders}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={(size) => {
                                    setPageSize(size);
                                    setPage(1);
                                }}
                                pageSizeOptions={[25, 50, 100]}
                                isFetching={isFetching}
                                unitLabel="đơn"
                            />
                            {isFetching && <Loader2 className="animate-spin text-primary" size={18} />}
                        </div>
                    </>
                ) : (
                    <EmptyState icon={ShoppingBag} title="Không tìm thấy đơn hàng nào." />
                )}
            </div>

            <EditOrderDialog
                key={editKey}
                open={editOpen}
                onOpenChange={setEditOpen}
                order={editingOrder}
                tailors={tailors}
                currentUserId={currentUserId}
            />

            <Dialog
                open={payOpen}
                onOpenChange={(next) => {
                    if (!payFlowBusy) setPayOpen(next);
                }}
            >
                <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Ghi nhận thanh toán · Đơn #{payingOrder?.id}</DialogTitle>
                    </DialogHeader>
                    {payingOrder && (
                        <PaymentForm
                            key={payingOrder.id}
                            order={payingOrder}
                            isSubmitting={isProcessingPayment || payFlowBusy}
                            onCancel={() => setPayOpen(false)}
                            onSubmit={handlePayment}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <DeliverOrderDialog
                open={deliverOpen}
                onOpenChange={setDeliverOpen}
                order={deliveringOrder}
                isPending={isUpdatingOrder}
                onConfirm={handleConfirmDeliver}
            />

            <ConfirmDialog
                open={completeOpen}
                onOpenChange={setCompleteOpen}
                title={
                    completingOrder
                        ? `Hoàn thành đơn #${String(completingOrder.id).padStart(5, "0")}`
                        : "Hoàn thành đơn"
                }
                description={
                    <div className="space-y-3">
                        <p className="leading-relaxed">
                            Bạn xác nhận <strong>hoàn thành đơn</strong> này? Hệ thống sẽ đặt{" "}
                            <strong>tất cả món</strong> trong đơn sang trạng thái <strong>Xong việc (thợ)</strong> và
                            đơn sang <strong>Hoàn thành</strong>.{" "}
                            <span className="text-foreground">Không thay đổi thanh toán.</span>
                        </p>
                        {(completingOrder?.details?.length ?? 0) > 0 && (
                            <p className="text-[11px]">{completingOrder?.details?.length} dòng món trong đơn.</p>
                        )}
                        {completingDebt > 0 && (
                            <p className="font-bold leading-relaxed text-warning">
                                Đơn còn nợ {formatVnd(completingDebt)}. Thu đủ tiền trước khi hoàn thành đơn.
                            </p>
                        )}
                    </div>
                }
                confirmLabel="Xác nhận hoàn thành"
                isPending={rowBusy}
                onConfirm={handleConfirmComplete}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Xóa đơn hàng"
                description={
                    <>
                        Bạn có chắc chắn muốn xóa đơn hàng{" "}
                        <span className="font-bold text-foreground">#{deletingOrder?.id}</span>?
                    </>
                }
                confirmLabel="Xóa vĩnh viễn"
                pendingLabel="Đang xóa..."
                cancelLabel="Giữ lại"
                destructive
                isPending={isDeletingOrder}
                onConfirm={handleDelete}
            />

            <InvoicePrintDialog order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />

            <BatchPrintDialog
                ref={batchPrintRootRef}
                open={batchPrintOpen}
                onClose={() => setBatchPrintOpen(false)}
                orders={batchOrders}
                printing={batchPrinting}
                silentReady={isSilentThermalConfigured()}
                onPrint={handleBatchPrint}
            />

            <ItemLabelsPrintDialog
                order={labelOrder}
                lineIndices1Based={labelLineIndices}
                onClose={() => {
                    setLabelOrder(null);
                    setLabelLineIndices(null);
                }}
            />

            <OrderDetailModal
                isOpen={detailModalOrderId != null}
                onClose={() => setDetailModalOrderId(null)}
                orderId={detailModalOrderId}
                onPrintItemBarcode={(order, lineIndex1Based) => {
                    setLabelOrder(order);
                    setLabelLineIndices([lineIndex1Based]);
                }}
            />
        </div>
    );
}
