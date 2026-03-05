'use client';

import React, { useState } from 'react';
import {
  Search,
  PackageCheck,
  Calendar,
  UserCheck,
  Phone,
  CheckCircle2,
  Clock,
  Scissors
} from 'lucide-react';
import { useOrders, useUpdateOrder } from '@/api/orders';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Order, OrderDetail } from '@/lib/types';

export default function ReturnsPage() {
  const { data: orders, isLoading } = useOrders();
  const updateOrder = useUpdateOrder();
  const { toast, showToast, hideToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [tab, setTab] = useState<'ready' | 'delivered'>('ready');
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);

  const readyOrders = orders?.filter(o => {
    if (o.status !== 'Ready') return false;
    const matchSearch = !debouncedSearch ||
      o.id.toString().includes(debouncedSearch) ||
      o.customer?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.customer?.phone?.includes(debouncedSearch);
    return matchSearch;
  }) || [];

  const deliveredOrders = orders?.filter(o => {
    if (o.status !== 'Delivered') return false;
    const matchSearch = !debouncedSearch ||
      o.id.toString().includes(debouncedSearch) ||
      o.customer?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.customer?.phone?.includes(debouncedSearch);
    return matchSearch;
  }) || [];

  const displayedOrders = tab === 'ready' ? readyOrders : deliveredOrders;

  const handleReturn = async () => {
    if (!returningOrder) return;
    try {
      await updateOrder.mutateAsync({
        id: returningOrder.id,
        order: {
          status: 'Delivered' as Order['status'],
          return_time: new Date().toISOString(),
        },
      });
      setReturningOrder(null);
      showToast(`Đã trả đồ đơn #${returningOrder.id} thành công`, 'success');
    } catch (err: any) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Trả đồ cho khách</h4>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="px-2.5 py-1 rounded-md bg-success/10 text-success">Chờ trả: {orders?.filter(o => o.status === 'Ready').length || 0}</span>
          <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary">Đã trả: {orders?.filter(o => o.status === 'Delivered').length || 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        <button
          onClick={() => setTab('ready')}
          className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tab === 'ready' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Clock size={14} className="inline mr-1.5" />Chờ trả ({readyOrders.length})
        </button>
        <button
          onClick={() => setTab('delivered')}
          className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tab === 'delivered' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CheckCircle2 size={14} className="inline mr-1.5" />Đã trả ({deliveredOrders.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Tìm mã đơn, tên hoặc SĐT khách..." className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Order list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="vuexy-card h-28 animate-pulse" />)
        ) : displayedOrders.length > 0 ? (
          displayedOrders.map(order => {
            const debt = order.total_amount - (order.paid_amount || 0);
            return (
              <div key={order.id} className="vuexy-card p-4 md:p-5 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <div className={`w-11 h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center shrink-0 ${order.status === 'Delivered' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                      {order.status === 'Delivered' ? <PackageCheck size={22} /> : <Scissors size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h6 className="font-bold text-foreground">#{order.id.toString().padStart(5, '0')}</h6>
                        {order.status === 'Delivered' && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">Đã trả</span>}
                        {order.status === 'Ready' && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success">Chờ trả</span>}
                      </div>

                      {/* Customer info */}
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">{order.customer?.name || 'Vãng lai'}</p>
                        {order.customer?.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={11} />{order.customer.phone}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" />Nhận: {new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                        {order.return_time && <span className="flex items-center gap-1"><PackageCheck size={12} className="text-primary" />Trả: {new Date(order.return_time).toLocaleDateString('vi-VN')}</span>}
                      </div>

                      {/* Items */}
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

                  {/* Right side */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0">
                    <div className="text-right flex-1 sm:flex-none">
                      <p className="text-base font-black text-foreground">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}</p>
                      {debt > 0 && <p className="text-[10px] font-bold text-warning">Còn nợ: {new Intl.NumberFormat('vi-VN').format(debt)}đ</p>}
                      {debt <= 0 && <p className="text-[10px] font-bold text-success">Đã thanh toán đủ</p>}
                    </div>

                    {tab === 'ready' && (
                      <button
                        onClick={() => setReturningOrder(order)}
                        className="px-4 py-2 bg-primary text-white rounded-md font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <PackageCheck size={14} />Trả đồ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="vuexy-card p-16 text-center flex flex-col items-center gap-3 bg-transparent border-2 border-dashed border-border shadow-none">
            <PackageCheck size={40} className="text-muted-foreground opacity-20" />
            <p className="text-muted-foreground italic">
              {tab === 'ready' ? 'Không có đơn nào chờ trả đồ.' : 'Chưa có đơn nào đã trả.'}
            </p>
          </div>
        )}
      </div>

      {/* Return Confirmation Modal */}
      <Modal isOpen={!!returningOrder} onClose={() => setReturningOrder(null)} title="Xác nhận trả đồ">
        <div className="space-y-6">
          {returningOrder && (
            <>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Đơn #{returningOrder.id.toString().padStart(5, '0')}</span>
                  <span className="text-sm font-bold text-foreground">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(returningOrder.total_amount)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <UserCheck size={14} className="text-primary" />
                  <span className="font-medium">{returningOrder.customer?.name || 'Vãng lai'}</span>
                  {returningOrder.customer?.phone && <span className="text-muted-foreground">- {returningOrder.customer.phone}</span>}
                </div>
                {returningOrder.details && returningOrder.details.length > 0 && (
                  <div className="border-t border-primary/10 pt-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">Danh sách đồ</p>
                    {returningOrder.details.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-foreground">{d.item_name}</span>
                        <span className="text-muted-foreground">{new Intl.NumberFormat('vi-VN').format(d.unit_price)}đ</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(() => {
                const debt = returningOrder.total_amount - (returningOrder.paid_amount || 0);
                if (debt > 0) {
                  return (
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-xs font-bold text-warning">Khách còn nợ {new Intl.NumberFormat('vi-VN').format(debt)}đ. Hãy thu tiền trước khi trả đồ.</p>
                    </div>
                  );
                }
                return null;
              })()}

              <p className="text-sm text-muted-foreground">Xác nhận đã trả đồ cho khách? Trạng thái đơn sẽ chuyển sang <span className="font-bold text-primary">&quot;Đã trả đồ&quot;</span>.</p>

              <div className="flex gap-4">
                <button onClick={() => setReturningOrder(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border hover:bg-muted transition-colors">Hủy</button>
                <button onClick={handleReturn} disabled={updateOrder.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {updateOrder.isPending ? 'Đang xử lý...' : <><PackageCheck size={16} />Xác nhận trả đồ</>}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
