'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  useOrdersInfinite,
  useUpdateOrder,
  useUpdateOrderDetail,
  useAddOrderDetails,
  useDeleteOrder,
  fetchOrdersForExport,
  type OrdersFilters,
  type NewOrderDetailItem,
} from '@/api/orders';
import { useOrderLogs } from '@/api/orderLogs';
import { useProcessPayment } from '@/api/payments';
import { useEmployees } from '@/api/users';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { InvoicePrint } from '@/components/ui/InvoicePrint';
import { useDebounce } from '@/hooks/useDebounce';
import { Can } from '@/components/auth/Can';
import { Order, OrderDetail, User, Role } from '@/lib/types';

const statusOptions = [
  { value: 'New', label: 'Mới', color: 'bg-info/10 text-info' },
  { value: 'In Progress', label: 'Đang xử lý', color: 'bg-warning/10 text-warning' },
  { value: 'Ready', label: 'Đã xong', color: 'bg-success/10 text-success' },
  { value: 'Delivered', label: 'Đã trả đồ', color: 'bg-primary/10 text-primary' },
  { value: 'Completed', label: 'Hoàn thành', color: 'bg-secondary/10 text-secondary' },
];

const detailStatusOptions = [
  { value: 'New', label: 'Mới' },
  { value: 'In Progress', label: 'Đang làm' },
  { value: 'Ready', label: 'Đã xong' },
  { value: 'Completed', label: 'Hoàn thành' },
];

const getStatusStyle = (status: string) => statusOptions.find(s => s.value === status) || statusOptions[0];

const statusLabelMap: Record<string, string> = {
  New: 'Mới',
  'In Progress': 'Đang làm',
  Ready: 'Đã xong',
  Delivered: 'Đã trả đồ',
  Completed: 'Hoàn thành',
};

function OrderLogSection({ orderId }: { orderId: number | null }) {
  const { data: logs, isLoading } = useOrderLogs(orderId);
  const [open, setOpen] = useState(false);
  if (!orderId) return null;
  return (
    <div className="mb-4 border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase bg-muted/20 flex justify-between items-center">
        Lịch sử thay đổi
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="max-h-40 overflow-y-auto p-3 space-y-2 text-xs">
          {isLoading ? (
            <p className="text-muted-foreground italic">Đang tải...</p>
          ) : logs && logs.length > 0 ? (
            logs.map((log: any) => (
              <div key={log.id} className="flex justify-between gap-2 text-muted-foreground border-b border-border/50 pb-1.5 last:border-0">
                <span>{log.action}</span>
                <span>{log.user?.name || 'Hệ thống'} · {new Date(log.created_at).toLocaleString('vi-VN')}</span>
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

export default function OrdersPage() {
  const currentUserId = useCurrentUserId();
  const { data: employees } = useEmployees();
  const updateOrder = useUpdateOrder();
  const updateDetail = useUpdateOrderDetail();
  const addOrderDetails = useAddOrderDetails();
  const deleteOrder = useDeleteOrder();
  const processPayment = useProcessPayment();
  const { toast, showToast, hideToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [payForm, setPayForm] = useState<{ amount: string; method: 'Cash' | 'Card' | 'Transfer' }>({ amount: '', method: 'Cash' });
  const [exporting, setExporting] = useState(false);
  const [detailEdits, setDetailEdits] = useState<Record<number, { status: string; assigned_tailor_id: string }>>({});
  const [newItems, setNewItems] = useState<Array<{ name: string; price: string; description: string;  assigned_tailor_id: string }>>([]);

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    const edits: Record<number, { status: string; assigned_tailor_id: string }> = {};
    order.details?.forEach(d => {
      edits[d.id] = {
        status: d.status,
        assigned_tailor_id: d.assigned_tailor_id ? String(d.assigned_tailor_id) : '',
      };
    });
    setDetailEdits(edits);
    setNewItems([]);
  };

  const addNewItemRow = () => {
    setNewItems(prev => [...prev, { name: '', price: '', description: '', assigned_tailor_id: '' }]);
  };

  const updateNewItem = (index: number, field: 'name' | 'price' | 'description' | 'assigned_tailor_id', value: string) => {
    setNewItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeNewItem = (index: number) => {
    setNewItems(prev => prev.filter((_, i) => i !== index));
  };

  const filters: OrdersFilters = {
    status: statusFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrdersInfinite(filters);

  const ordersRaw = data?.pages.flat() ?? [];
  const orders = ordersRaw.filter((o, i, arr) => arr.findIndex(x => x.id === o.id) === i);
  const filtered = orders.filter(o => {
    const matchSearch = !debouncedSearch ||
      o.id.toString().includes(debouncedSearch) ||
      o.customer?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.customer?.phone?.includes(debouncedSearch);
    return matchSearch;
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreCallback = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMoreCallback(); },
      { rootMargin: '200px', threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMoreCallback]);

  const tailors = employees?.filter((e: User & { role: Role | null }) => e.role?.name === 'Thợ may') || [];

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    const fd = new FormData(e.currentTarget);
    try {
      const newOrderStatus = fd.get('order-status') as string;
      if (newOrderStatus && newOrderStatus !== editingOrder.status) {
        await updateOrder.mutateAsync({ id: editingOrder.id, order: { status: newOrderStatus as Order['status'] }, updated_by: currentUserId ?? undefined });
      }
      for (const detail of editingOrder.details || []) {
        const edit = detailEdits[detail.id];
        if (!edit) continue;
        const patch: Partial<OrderDetail> = {};
        if (edit.status !== detail.status) patch.status = edit.status as OrderDetail['status'];
        const origTailor = detail.assigned_tailor_id ? String(detail.assigned_tailor_id) : '';
        if (edit.assigned_tailor_id !== origTailor) patch.assigned_tailor_id = edit.assigned_tailor_id || null;
        if (Object.keys(patch).length > 0) {
          await updateDetail.mutateAsync({ id: detail.id, detail: patch, updated_by: currentUserId ?? undefined });
        }
      }
      const toAdd: NewOrderDetailItem[] = newItems
        .filter(row => row.name.trim() !== '' && Number(row.price) > 0)
        .map(row => ({
          item_name: row.name.trim(),
          unit_price: Number(row.price),
          description: row.description.trim() || null,
          assigned_tailor_id: row.assigned_tailor_id ? row.assigned_tailor_id : null,
        }));
      if (toAdd.length > 0) {
        await addOrderDetails.mutateAsync({
          orderId: editingOrder.id,
          items: toAdd,
          updated_by: currentUserId ?? undefined,
        });
      }
      setEditingOrder(null);
      showToast('Cập nhật đơn hàng thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deletingOrder) return;
    try {
      await deleteOrder.mutateAsync({ id: deletingOrder.id, updated_by: currentUserId ?? undefined });
      setDeletingOrder(null);
      showToast('Xóa đơn hàng thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder || !payForm.amount) return;
    try {
      await processPayment.mutateAsync({
        order_id: payingOrder.id,
        amount: Number(payForm.amount),
        payment_method: payForm.method as any,
        updated_by: currentUserId ?? undefined,
      });
      setPayingOrder(null);
      setPayForm({ amount: '', method: 'Cash' });
      showToast('Thanh toán thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = await fetchOrdersForExport(filters);
      const data = rows.map(o => ({
        'Mã đơn': o.id,
        'Ngày tạo': new Date(o.created_at).toLocaleDateString('vi-VN'),
        'Khách hàng': o.customer?.name || 'Vãng lai',
        'SĐT': o.customer?.phone || '',
        'Tổng tiền': o.total_amount,
        'Đã trả': o.paid_amount || 0,
        'Trạng thái': statusLabelMap[o.status] ?? 'Đang xử lý',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');
      XLSX.writeFile(wb, `don-hang-${startDate || 'start'}-${endDate || 'end'}.xlsx`);
      showToast('Đã xuất Excel', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
    finally { setExporting(false); }
  };

  const selectClass = 'w-full bg-muted/20 border border-border rounded-md px-3 py-2 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Quản lý đơn hàng</h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingBag size={16} /> Đã tải: {orders.length}
          {hasNextPage && <span className="text-primary"> (cuộn để tải thêm)</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input type="text" placeholder="Tìm mã đơn, tên hoặc SĐT khách..." className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-muted-foreground">→</span>
            <input type="date" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="relative">
            <select className="bg-card border border-border rounded-md px-4 py-2.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary pr-10 min-w-[160px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
          </div>
          <Can permission="view_orders">
            <button type="button" onClick={handleExportExcel} disabled={exporting} className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success border border-success/30 rounded-md font-bold text-sm hover:bg-success/20 disabled:opacity-50">
              <FileDown size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          </Can>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="vuexy-card h-24 animate-pulse" />)
        ) : filtered.length > 0 ? (
          <>
            {filtered.map(order => {
              const st = getStatusStyle(order.status);
              const debt = order.total_amount - (order.paid_amount || 0);
              const isPaid = debt <= 0;
              return (
                <div key={order.id} className="vuexy-card p-4 md:p-5 hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ShoppingBag size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h6 className="font-bold text-foreground">#{order.id.toString().padStart(5, '0')}</h6>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${st.color}`}>{st.label}</span>
                        </div>
                        <p className="text-sm text-foreground font-medium">{order.customer?.name || 'Vãng lai'}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" />{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        {order.details && order.details.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {order.details.map(d => (
                              <span key={d.id} className="text-[10px] px-2 py-0.5 bg-muted/30 rounded border border-border text-muted-foreground">
                                {d.item_name}
                                {d.tailor?.name && <span className="text-primary ml-1">· {d.tailor.name}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0">
                      <div className="text-right flex-1 sm:flex-none">
                        <p className="text-base font-black text-foreground">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}</p>
                        {debt > 0 && <p className="text-[10px] font-bold text-warning">Nợ: {new Intl.NumberFormat('vi-VN').format(debt)}đ</p>}
                        {isPaid && <p className="text-[10px] font-bold text-success">Đã thanh toán</p>}
                      </div>
                      <div className="flex gap-1.5">
                        {debt > 0 && (
                          <Can permission="process_payment">
                            <button type="button" onClick={() => { setPayingOrder(order); setPayForm({ amount: String(debt), method: 'Cash' }); }} className="p-2 rounded-md text-success hover:bg-success/10 transition-colors" title="Thanh toán"><DollarSign size={16} /></button>
                          </Can>
                        )}
                        {isPaid && (
                          <button onClick={() => setInvoiceOrder(order)} className="p-2 rounded-md text-primary hover:bg-primary/10 transition-colors" title="In phiếu"><Printer size={16} /></button>
                        )}
                        <button onClick={() => openEditModal(order)} className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Sửa"><Edit2 size={16} /></button>
                        <button onClick={() => setDeletingOrder(order)} className="p-2 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors" title="Xóa"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage && <Loader2 className="animate-spin text-primary" size={24} />}
            </div>
          </>
        ) : (
          <div className="vuexy-card p-16 text-center flex flex-col items-center gap-3 bg-transparent border-2 border-dashed border-border shadow-none">
            <ShoppingBag size={40} className="text-muted-foreground opacity-20" />
            <p className="text-muted-foreground italic">Không tìm thấy đơn hàng nào.</p>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title={`Cập nhật đơn #${editingOrder?.id}`} maxWidth="max-w-2xl">
        <OrderLogSection orderId={editingOrder?.id ?? null} />
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Trạng thái đơn hàng</label>
            <div className="relative">
              <select name="order-status" className={selectClass} defaultValue={editingOrder?.status || 'New'}>
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
            </div>
          </div>
          {editingOrder?.details && editingOrder.details.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Chi tiết sản phẩm</p>
              {editingOrder.details.map(d => (
                <div key={d.id} className="p-3 border border-border rounded-lg bg-muted/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{d.item_name}</span>
                    <span className="text-xs text-muted-foreground">{new Intl.NumberFormat('vi-VN').format(d.unit_price)}đ</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Trạng thái</label>
                      <div className="relative">
                        <select
                          name={`detail-status-${d.id}`}
                          className={selectClass}
                          value={detailEdits[d.id]?.status ?? d.status}
                          onChange={e => setDetailEdits(prev => ({ ...prev, [d.id]: { ...(prev[d.id] ?? { status: d.status, assigned_tailor_id: d.assigned_tailor_id ? String(d.assigned_tailor_id) : '' }), status: e.target.value } }))}
                        >
                          {detailStatusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Phân công thợ</label>
                      <div className="relative">
                        <select
                          name={`detail-tailor-${d.id}`}
                          className={selectClass}
                          value={detailEdits[d.id]?.assigned_tailor_id ?? (d.assigned_tailor_id ? String(d.assigned_tailor_id) : '')}
                          onChange={e => setDetailEdits(prev => ({ ...prev, [d.id]: { ...(prev[d.id] ?? { status: d.status, assigned_tailor_id: d.assigned_tailor_id ? String(d.assigned_tailor_id) : '' }), assigned_tailor_id: e.target.value } }))}
                        >
                          <option value="">Chưa phân công</option>
                          {tailors.map((t: User & { role: Role | null }) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Thêm sản phẩm</p>
              <button type="button" onClick={addNewItemRow} className="text-xs font-bold text-primary hover:underline">
                + Thêm dòng
              </button>
            </div>
            {newItems.length > 0 && (
              <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/5">
                {newItems.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên SP</label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={e => updateNewItem(idx, 'name', e.target.value)}
                        placeholder="Tên sản phẩm"
                        className={selectClass}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Đơn giá (đ)</label>
                      <input
                        type="number"
                        min="0"
                        value={row.price}
                        onChange={e => updateNewItem(idx, 'price', e.target.value)}
                        placeholder="0"
                        className={selectClass}
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Mô tả</label>
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => updateNewItem(idx, 'description', e.target.value)}
                        placeholder="Tùy chọn"
                        className={selectClass}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Thợ</label>
                      <select
                        value={row.assigned_tailor_id}
                        onChange={e => updateNewItem(idx, 'assigned_tailor_id', e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Chưa phân công</option>
                        {tailors.map((t: User & { role: Role | null }) => (
                          <option key={t.id} value={String(t.id)}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeNewItem(idx)} className="p-2 text-muted-foreground hover:text-danger" title="Xóa dòng">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setEditingOrder(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Hủy</button>
            <button type="submit" disabled={updateOrder.isPending || updateDetail.isPending || addOrderDetails.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">
              {(updateOrder.isPending || updateDetail.isPending || addOrderDetails.isPending) ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={!!payingOrder} onClose={() => setPayingOrder(null)} title={`Thanh toán đơn #${payingOrder?.id}`}>
        <form onSubmit={handlePayment} className="space-y-5">
          <div className="p-4 bg-muted/10 rounded-lg border border-border space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tổng cộng</span><span className="font-bold">{payingOrder && new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payingOrder.total_amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Đã trả</span><span className="font-bold text-success">{payingOrder && new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payingOrder.paid_amount)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t border-border pt-2"><span className="text-primary">Còn lại</span><span className="text-primary">{payingOrder && new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payingOrder.total_amount - (payingOrder?.paid_amount || 0))}</span></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Số tiền thanh toán</label>
            <input required type="number" min="1" className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Phương thức</label>
            <select className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value as 'Cash' | 'Card' | 'Transfer' })}>
              <option value="Cash">Tiền mặt</option>
              <option value="Card">Thẻ</option>
              <option value="Transfer">Chuyển khoản</option>
            </select>
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setPayingOrder(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Hủy</button>
            <button type="submit" disabled={processPayment.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">{processPayment.isPending ? 'Đang xử lý...' : 'Xác nhận'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deletingOrder} onClose={() => setDeletingOrder(null)} title="Xóa đơn hàng">
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">Bạn có chắc chắn muốn xóa đơn hàng <span className="font-bold text-foreground">#{deletingOrder?.id}</span>?</p>
          <div className="flex gap-4">
            <button onClick={() => setDeletingOrder(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Giữ lại</button>
            <button onClick={handleDelete} disabled={deleteOrder.isPending} className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50">{deleteOrder.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</button>
          </div>
        </div>
      </Modal>

      {/* Invoice Print Modal */}
      <Modal isOpen={!!invoiceOrder} onClose={() => setInvoiceOrder(null)} title="Phiếu thanh toán" maxWidth="max-w-lg">
        <div className="print:block">
          {invoiceOrder && <InvoicePrint order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
