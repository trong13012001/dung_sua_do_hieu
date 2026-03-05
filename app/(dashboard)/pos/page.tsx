'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  ChevronDown,
  Users,
  Phone,
  X
} from 'lucide-react';
import { useGetCustomer } from '@/hooks/customer/useGetCustomer';
import { useCreateOrder } from '@/api/orders';
import { useEmployees } from '@/api/users';
import { Toast, useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Customer, Order, User, Role } from '@/lib/types';

interface PosItem {
  name: string;
  price: number;
  description: string;
  assigned_tailor_id: string;
}

export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [showCustomerList, setShowCustomerList] = useState(false);

  const { data: customerData } = useGetCustomer(0, 100, debouncedSearchTerm);
  const customers = customerData?.data || [];
  const { data: employees } = useEmployees();
  const createOrder = useCreateOrder();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [items, setItems] = useState<PosItem[]>([]);

  const tailors = useMemo(() =>
    employees?.filter((e: User & { role: Role | null }) =>
      e.role?.name === 'Thợ may'
    ) || [],
    [employees]
  );

  const addItem = () => setItems([...items, { name: '', price: 0, description: '', assigned_tailor_id: '' }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof PosItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerList(false);
    setSearchTerm('');
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || items.length === 0) {
      showToast('Vui lòng chọn khách hàng và thêm ít nhất một sản phẩm.', 'error');
      return;
    }
    try {
      await createOrder.mutateAsync({
        order: {
          customer_id: selectedCustomer.id,
          total_amount: totalAmount,
          status: 'New',
        } as Partial<Order>,
        items: items.map(i => ({
          name: i.name,
          price: i.price,
          description: i.description,
          assigned_tailor_id: i.assigned_tailor_id || null,
        })),
      });
      showToast('Đơn hàng đã được tạo thành công!', 'success');
      setItems([]);
      setSelectedCustomer(null);
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2 space-y-4 md:space-y-6">
        {/* Customer Selection */}
        <div className="vuexy-card p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-bold text-foreground">Thông tin khách hàng</h4>
          </div>

          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 md:p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={11} />{selectedCustomer.phone || 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"><X size={16} /></button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc SĐT khách hàng..."
                  className="w-full bg-muted/10 border border-border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)}
                />
              </div>
              {showCustomerList && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                  {customers.length > 0 ? customers.map((c: Customer) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3 border-b border-border/50 last:border-none"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><Users size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.phone || 'Không có SĐT'} {c.address ? `· ${c.address}` : ''}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground italic">
                      {searchTerm ? 'Không tìm thấy khách hàng' : 'Nhập tên hoặc SĐT để tìm'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products with per-item tailor */}
        <div className="vuexy-card p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-bold text-foreground">Sản phẩm đơn hàng</h4>
            <button onClick={addItem} className="btn-primary px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md flex items-center gap-1.5 md:gap-2">
              <Plus size={14} /> Thêm
            </button>
          </div>

          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-lg text-muted-foreground italic text-sm">
                Chưa có sản phẩm nào. Nhấn &quot;Thêm&quot; để bắt đầu.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={index} className="p-3 md:p-4 border border-border rounded-lg bg-muted/5 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Tên sản phẩm</label>
                      <input className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm" placeholder="vd: Sửa túi da" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Giá tiền</label>
                      <input type="number" className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm" placeholder="0" value={item.price || ''} onChange={e => updateItem(index, 'price', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Mô tả</label>
                      <input className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm" placeholder="Ghi chú thêm..." value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Phân công thợ</label>
                      <div className="relative">
                        <select className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm appearance-none outline-none" value={item.assigned_tailor_id} onChange={e => updateItem(index, 'assigned_tailor_id', e.target.value)}>
                          <option value="">Chưa phân công</option>
                          {tailors.map((t: User & { role: Role | null }) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeItem(index)} className="absolute -top-2 -right-2 bg-danger text-white p-1 rounded-full shadow-md hover:bg-danger/80">
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="space-y-4 md:space-y-6">
        <div className="vuexy-card p-4 md:p-6 lg:sticky lg:top-6">
          <h4 className="text-base md:text-lg font-bold text-foreground mb-4 md:mb-6">Tổng kết đơn hàng</h4>

          {selectedCustomer && (
            <div className="mb-4 p-3 bg-muted/20 rounded-lg text-xs">
              <p className="font-bold text-foreground">{selectedCustomer.name}</p>
              <p className="text-muted-foreground">{selectedCustomer.phone}</p>
            </div>
          )}

          <div className="space-y-3 mb-6 pt-4 border-t border-border">
            {items.filter(i => i.name).map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate mr-2">{item.name}</span>
                <span className="font-bold text-foreground shrink-0">{new Intl.NumberFormat('vi-VN').format(Number(item.price) || 0)}đ</span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-4">
              <span className="text-foreground">Tổng cộng</span>
              <span className="text-primary">{new Intl.NumberFormat('vi-VN').format(totalAmount)}đ</span>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={createOrder.isPending} className="w-full btn-primary py-3 rounded-md font-bold mb-3 disabled:opacity-50">
            {createOrder.isPending ? 'Đang xử lý...' : 'Đặt hàng'}
          </button>
          <div className="flex items-center gap-2 p-3 bg-info/10 rounded border border-info/20">
            <CheckCircle2 size={16} className="text-info shrink-0" />
            <p className="text-[11px] text-info font-medium leading-tight">Kiểm tra kỹ thông tin đơn hàng trước khi xác nhận.</p>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
