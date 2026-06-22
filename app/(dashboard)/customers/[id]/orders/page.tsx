'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ShoppingBag,
  Calendar,
  Clock,
  ChevronRight,
  User as UserIcon,
  Phone,
  MapPin,
  Receipt,
  Printer,
  Edit2,
  Trash2,
  Search,
  Loader2,
} from 'lucide-react';
import { useGetCustomerOrders } from '@/hooks/customer/useGetCustomerOrders';
import { useGetCustomerDetail } from '@/hooks/customer/useGetCustomerDetail';
import { useOrderLogs } from '@/api/orderLogs';
import {
  getOrder,
  useAddOrderDetails,
  useDeleteOrder,
  useDeleteOrderDetail,
  useUpdateOrder,
  useUpdateOrderDetail,
  type NewOrderDetailItem,
} from '@/api/orders';
import { useEmployees } from '@/api/users';
import { Modal } from '@/components/ui/Modal';
import { OrderDetailModal } from '@/components/ui/OrderDetailModal';
import {
  EditOrderForm,
  type EditOrderSubmitData,
} from '@/components/orders/EditOrderForm';
import { ItemLabelsPrint } from '@/components/ui/ItemLabelsPrint';
import { InvoicePrint } from '@/components/ui/InvoicePrint';
import { Toast, useToast } from '@/components/ui/Toast';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useDebounce } from '@/hooks/useDebounce';
import { Order, OrderDetail, Role, User } from '@/lib/types';
import { orderStatusBadgeClass, orderStatusLabelVi } from '@/lib/orderStatusUi';
import { validateNumber } from '@/lib/validation';
import {
  canPrintInvoice,
  dateInputToReturnTime,
  returnTimeToDateInputValue,
} from '@/lib/canPrintInvoice';

const statusOptions = [
  { value: 'New', label: 'Mới' },
  { value: 'In Progress', label: 'Đang xử lý' },
  { value: 'Ready', label: 'Đã xong' },
  { value: 'Paid', label: 'Đã thanh toán' },
  { value: 'Delivered', label: 'Đã trả đồ' },
  { value: 'DeliveredOwing', label: 'Trả thiếu tiền' },
  { value: 'Completed', label: 'Hoàn thành' },
];

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
        <ChevronRight
          size={14}
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="max-h-40 overflow-y-auto p-3 space-y-2 text-xs">
          {isLoading ? (
            <p className="text-muted-foreground italic">Đang tải...</p>
          ) : logs && logs.length > 0 ? (
            logs.map((log: any) => (
              <div
                key={log.id}
                className="flex justify-between gap-2 text-muted-foreground border-b border-border/50 pb-1.5 last:border-0"
              >
                <span>{log.action}</span>
                <span>
                  {log.user?.name || 'Hệ thống'} ·{' '}
                  {new Date(log.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground italic">Chưa có lịch sử</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserId = useCurrentUserId();
  const { toast, showToast, hideToast } = useToast();
  const customerId = params.id as string;
  const { data: employees } = useEmployees();
  const { mutateAsync: mutateAsyncUpdateOrder, isPending: isPendingUpdateOrder } = useUpdateOrder();
  const { mutateAsync: mutateAsyncUpdateDetail, isPending: isPendingUpdateDetail } = useUpdateOrderDetail();
  const { mutateAsync: mutateAsyncAddOrderDetails, isPending: isPendingAddOrderDetails } = useAddOrderDetails();
  const { mutateAsync: mutateAsyncDeleteDetail, isPending: isPendingDeleteDetail } = useDeleteOrderDetail();
  const { mutateAsync: mutateAsyncDeleteOrder, isPending: isPendingDeleteOrder } = useDeleteOrder();

  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomerDetail(customerId);
  const { data: orders, isLoading: isLoadingOrders } = useGetCustomerOrders(customerId);

  const selectedOrderId = searchParams.get('orderId');

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingDetailId, setDeletingDetailId] = useState<number | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [labelLineIndices, setLabelLineIndices] = useState<number[] | null>(null);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const kw = debouncedSearch.trim().toLowerCase();
    if (!kw) return orders;
    return orders.filter((order: Order) => {
      if (String(order.id).includes(kw)) return true;
      if (order.transaction_code?.toLowerCase().includes(kw)) return true;
      if (orderStatusLabelVi(order.status).toLowerCase().includes(kw)) return true;
      return (
        order.details?.some(
          (d) =>
            d.item_name?.toLowerCase().includes(kw) ||
            d.description?.toLowerCase().includes(kw),
        ) ?? false
      );
    });
  }, [orders, debouncedSearch]);
  const tailors =
    employees?.filter((e: User & { role: Role | null }) => e.role?.name === 'Thợ may') || [];

  const handleBack = () => {
    router.push('/customers');
  };

  const handleViewDetails = (orderId: number) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('orderId', orderId.toString());
    router.push(`?${newParams.toString()}`);
  };

  const closeOrderDetail = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('orderId');
    router.push(`?${newParams.toString()}`);
  };

  const handlePrintInvoice = async (
    e: React.MouseEvent,
    order: Order,
  ) => {
    e.stopPropagation();
    setPrintingOrderId(order.id);
    try {
      const fresh = await getOrder(order.id);
      const check = canPrintInvoice(fresh);
      if (!check.ok) {
        showToast(check.message, 'error');
        return;
      }
      setInvoiceOrder(fresh);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không tải được đơn hàng';
      showToast(`Lỗi: ${message}`, 'error');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    try {
      await mutateAsyncDeleteOrder({
        id: deletingOrder.id,
        updated_by: currentUserId ?? undefined,
      });
      if (invoiceOrder?.id === deletingOrder.id) {
        setInvoiceOrder(null);
      }
      setDeletingOrder(null);
      showToast('Xóa đơn hàng thành công', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xóa thất bại';
      showToast(`Lỗi: ${message}`, 'error');
    }
  };

  // State nhập liệu (detailEdits, newItems, ngày hẹn trả) nằm trong <EditOrderForm>.
  const openEditModal = (order: Order) => {
    setEditingOrder(order);
  };

  const handleUpdate = async (data: EditOrderSubmitData) => {
    if (!editingOrder) return;
    const { detailEdits, newItems } = data;
    try {
      const orderStatusChoice = data.orderStatusChoice || editingOrder.status;
      if (
        orderStatusChoice === 'Completed' &&
        editingOrder.status !== 'Completed'
      ) {
        const editDebt =
          editingOrder.total_amount - (editingOrder.paid_amount || 0);
        if (editDebt > 0) {
          showToast(
            'Chỉ hoàn thành đơn khi đã thu đủ tiền (còn nợ trên đơn).',
            'error',
          );
          return;
        }
      }
      const returnDateInput =
        data.returnDate ?? returnTimeToDateInputValue(editingOrder.return_time);
      const newReturnTime = dateInputToReturnTime(returnDateInput);
      const origReturnYmd = returnTimeToDateInputValue(editingOrder.return_time);
      const orderPatch: Partial<Order> = {};
      if (orderStatusChoice && orderStatusChoice !== editingOrder.status) {
        orderPatch.status = orderStatusChoice as Order['status'];
      }
      if (returnDateInput !== origReturnYmd) {
        orderPatch.return_time = newReturnTime;
      }
      if (Object.keys(orderPatch).length > 0) {
        await mutateAsyncUpdateOrder({
          id: editingOrder.id,
          order: orderPatch,
          updated_by: currentUserId ?? undefined,
        });
      }
      for (const detail of editingOrder.details || []) {
        const edit = detailEdits[detail.id];
        if (!edit) continue;
        const priceNum = Number(edit.unit_price);
        if (
          edit.unit_price.trim() !== '' &&
          (Number.isNaN(priceNum) || priceNum < 0)
        ) {
          showToast(
            `Sản phẩm "${edit.item_name || detail.item_name}": Đơn giá không hợp lệ`,
            'error',
          );
          return;
        }
        const patch: Partial<OrderDetail> = {};
        if (edit.item_name.trim() !== detail.item_name) patch.item_name = edit.item_name.trim();
        if (
          edit.unit_price.trim() !== '' &&
          priceNum !== Number(detail.unit_price)
        ) patch.unit_price = priceNum;
        if (edit.description !== (detail.description ?? '')) patch.description = edit.description.trim() || null;
        if (
          orderStatusChoice === 'Completed' &&
          detail.status !== 'Completed'
        ) {
          patch.status = 'Completed';
        } else if (edit.status !== detail.status) {
          patch.status = edit.status as OrderDetail['status'];
        }
        const origTailor = detail.assigned_tailor_id
          ? String(detail.assigned_tailor_id)
          : '';
        if (edit.assigned_tailor_id !== origTailor) {
          patch.assigned_tailor_id = edit.assigned_tailor_id ? edit.assigned_tailor_id : null;
        }
        if (Object.keys(patch).length > 0) {
          await mutateAsyncUpdateDetail({
            id: detail.id,
            detail: patch,
            updated_by: currentUserId ?? undefined,
          });
        }
      }
      for (let i = 0; i < newItems.length; i += 1) {
        const row = newItems[i];
        const hasName = row.name.trim() !== '';
        const priceErr = validateNumber(row.price, {
          min: 0,
          required: hasName,
          fieldName: 'Đơn giá',
        });
        if (hasName && priceErr) {
          showToast(`Dòng ${i + 1} (${row.name.trim()}): ${priceErr}`, 'error');
          return;
        }
      }
      const toAdd: NewOrderDetailItem[] = newItems
        .filter((row) => row.name.trim() !== '' && Number(row.price) >= 0)
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
      showToast('Cập nhật đơn hàng thành công', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cập nhật thất bại';
      showToast(`Lỗi: ${message}`, 'error');
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
      const newDetails = (editingOrder.details ?? []).filter((x) => x.id !== detailId);
      const subtract = d ? Number(d.unit_price) || 0 : 0;
      setEditingOrder({
        ...editingOrder,
        details: newDetails,
        total_amount: Math.max(0, editingOrder.total_amount - subtract),
      });
      setDeletingDetailId(null);
      showToast('Đã xóa dòng sản phẩm', 'success');
    } catch (err: any) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  if (isLoadingCustomer) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={handleBack}
            className="p-1.5 md:p-2 rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h4 className="text-lg md:text-xl font-bold text-foreground">Lịch sử đơn hàng</h4>
            <p className="text-xs md:text-sm text-muted-foreground">Khách hàng: <span className="font-bold text-primary">{customer?.name}</span></p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-success/10 text-success px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-success/20 flex items-center gap-2">
            <Receipt size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">
              Tổng đơn:{' '}
              {debouncedSearch.trim() && orders
                ? `${filteredOrders.length}/${orders.length}`
                : orders?.length || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="relative px-2 md:px-0">
        <Search
          className="absolute left-5 md:left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={16}
        />
        <input
          type="text"
          placeholder="Tìm mã đơn, sản phẩm, trạng thái..."
          className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-2 md:px-0">
        {/* Customer Info Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="vuexy-card p-4 md:p-6">
            <h5 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 md:mb-6 flex items-center gap-2">
              <UserIcon size={12} className="md:w-[14px] md:h-[14px]" /> Thông tin khách hàng
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <UserIcon size={14} className="md:w-[16px] md:h-[16px]" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">Họ tên</p>
                  <p className="text-xs md:text-sm font-bold text-foreground">{customer?.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Phone size={14} className="md:w-[16px] md:h-[16px]" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">Số điện thoại</p>
                  <p className="text-xs md:text-sm font-bold text-foreground">{customer?.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin size={14} className="md:w-[16px] md:h-[16px]" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">Địa chỉ</p>
                  <p className="text-xs md:text-sm font-bold text-foreground truncate max-w-[150px] sm:max-w-none">{customer?.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List Content */}
        <div className="lg:col-span-3 space-y-4">
          {isLoadingOrders ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="vuexy-card h-32 animate-pulse"></div>
            ))
          ) : orders && orders.length > 0 ? (
            filteredOrders.length > 0 ? (
            filteredOrders.map((order: Order) => (
              <div
                key={order.id}
                className="vuexy-card p-4 md:p-5 border border-border hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleViewDetails(order.id)}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                      <ShoppingBag size={20} className="md:w-[24px] md:h-[24px]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 md:gap-3">
                        <h6 className="font-bold text-foreground md:text-lg">#{order.id}</h6>
                        <span className={`px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black uppercase tracking-widest ${orderStatusBadgeClass(order.status)}`}>
                          {orderStatusLabelVi(order.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar size={12} className="text-primary md:w-[14px] md:h-[14px]" />
                          {new Date(order.receive_time).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={12} className="text-primary md:w-[14px] md:h-[14px]" />
                          {new Date(order.receive_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-none pt-2 sm:pt-0 mt-1 sm:mt-0">
                    <p className="text-base md:text-lg font-black text-foreground">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}
                    </p>
                    <div className="text-[9px] md:text-[10px] font-bold text-muted-foreground mt-0.5 md:mt-1 uppercase tracking-widest flex items-center justify-start sm:justify-end gap-1">
                      {order.paid_amount >= order.total_amount ? (
                        <span className="text-success flex items-center gap-1 font-black">
                          Đã thanh toán <ChevronRight size={10} className="rotate-90 hidden sm:block" />
                        </span>
                      ) : (
                        <span className="text-warning flex items-center gap-1 font-black">
                          Còn nợ: {new Intl.NumberFormat('vi-VN').format(order.total_amount - (order.paid_amount || 0))}đ
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center gap-3">
                  <div className="flex gap-2">
                    {order.details && order.details.slice(0, 3).map((detail, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-1 bg-muted/30 rounded border border-border font-medium text-muted-foreground">
                        {detail.item_name}
                      </span>
                    ))}
                    {order.details && order.details.length > 3 && (
                      <span className="text-[10px] px-2 py-1 bg-muted/30 rounded border border-border font-medium text-muted-foreground">
                        +{order.details.length - 3} nữa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => void handlePrintInvoice(e, order)}
                      disabled={printingOrderId === order.id}
                      className="p-2 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      title="In hóa đơn"
                    >
                      {printingOrderId === order.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Printer size={16} />
                      )}
                    </button>
                    {order.details && order.details.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLabelOrder(order);
                          setLabelLineIndices(null);
                        }}
                        className="p-2 rounded-md text-info hover:bg-info/10 transition-colors"
                        title="In tem barcode từng món"
                      >
                        <Printer size={16} className="scale-90" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(order);
                      }}
                      className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Sửa đơn"
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
                      title="Xóa đơn"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="text-xs font-bold text-primary flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                      Chi tiết <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            ))
            ) : (
              <div className="vuexy-card p-12 text-center flex flex-col items-center justify-center gap-3 bg-transparent border-2 border-dashed border-border shadow-none">
                <Search size={40} className="text-muted-foreground opacity-20" />
                <p className="text-muted-foreground font-medium italic">
                  Không tìm thấy đơn phù hợp với từ khóa.
                </p>
              </div>
            )
          ) : (
            <div className="vuexy-card p-20 text-center flex flex-col items-center justify-center gap-4 bg-transparent border-2 border-dashed border-border shadow-none">
              <ShoppingBag size={48} className="text-muted-foreground opacity-20" />
              <p className="text-muted-foreground font-medium italic">Không tìm thấy đơn hàng nào cho khách hàng này.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!editingOrder}
        onClose={() => {
          setEditingOrder(null);
          setDeletingDetailId(null);
        }}
        title={`Cập nhật đơn #${editingOrder?.id}`}
        maxWidth="max-w-4xl"
      >
        {editingOrder && (
          <EditOrderForm
            key={editingOrder.id}
            order={editingOrder}
            tailors={tailors}
            statusOptions={statusOptions}
            isPending={
              isPendingUpdateOrder ||
              isPendingUpdateDetail ||
              isPendingAddOrderDetails
            }
            logSlot={<OrderLogSection orderId={editingOrder.id} />}
            returnDate={{
              initial: returnTimeToDateInputValue(editingOrder.return_time),
            }}
            onCancel={() => {
              setEditingOrder(null);
              setDeletingDetailId(null);
            }}
            onRequestDeleteDetail={(id) => setDeletingDetailId(id)}
            onSubmit={handleUpdate}
          />
        )}
      </Modal>

      <Modal
        isOpen={deletingDetailId !== null}
        onClose={() => setDeletingDetailId(null)}
        title="Xóa dòng sản phẩm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa dòng sản phẩm này?
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
              onClick={() => {
                if (deletingDetailId != null) {
                  void handleDeleteDetail(deletingDetailId);
                }
              }}
              disabled={isPendingDeleteDetail}
              className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
            >
              {isPendingDeleteDetail ? 'Đang xóa...' : 'Xóa'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deletingOrder}
        onClose={() => setDeletingOrder(null)}
        title="Xóa đơn hàng"
      >
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Bạn có chắc chắn muốn xóa đơn hàng{' '}
            <span className="font-bold text-foreground">#{deletingOrder?.id}</span>
            ?
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setDeletingOrder(null)}
              className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border"
            >
              Giữ lại
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteOrder()}
              disabled={isPendingDeleteOrder}
              className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50"
            >
              {isPendingDeleteOrder ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        title={
          invoiceOrder
            ? `Phiếu thanh toán #${invoiceOrder.id.toString().padStart(5, '0')}`
            : 'Phiếu thanh toán'
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
              ? `In tem 1 món · Đơn #${labelOrder.id.toString().padStart(5, '0')}`
              : `In tem barcode đơn #${labelOrder.id.toString().padStart(5, '0')}`
            : 'In tem barcode'
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
            lineIndices1Based={labelLineIndices?.length ? labelLineIndices : undefined}
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

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={closeOrderDetail}
        orderId={selectedOrderId}
        onPrintItemBarcode={(order, lineIndex1Based) => {
          setLabelOrder(order);
          setLabelLineIndices([lineIndex1Based]);
        }}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
