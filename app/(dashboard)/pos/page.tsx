'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  ChevronDown,
  Users,
  Phone,
  X,
  UserPlus
} from 'lucide-react';
import { useGetCustomer } from '@/hooks/customer/useGetCustomer';
import { useCreateCustomer } from '@/hooks/customer/useCreateCustomer';
import { useCreateOrder } from '@/api/orders';
import { useEmployees } from '@/api/users';
import { Toast, useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ItemLabelsPrint } from '@/components/ui/ItemLabelsPrint';
import { useDebounce } from '@/hooks/useDebounce';
import { Customer, Order, User, Role } from '@/lib/types';
import { validateRequired, validateNumber, validatePhone, validateMaxLength } from '@/lib/validation';

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
  const createCustomer = useCreateCustomer();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [items, setItems] = useState<PosItem[]>([]);

  // Optional return appointment time
  const [returnDate, setReturnDate] = useState('');
  const [returnClock, setReturnClock] = useState('');

  // Label printing after creating order
  const [labelOrderId, setLabelOrderId] = useState<number | null>(null);
  const [labelItems, setLabelItems] = useState<PosItem[]>([]);
  const [labelCustomerName, setLabelCustomerName] = useState<string | null>(null);
  const [labelReceiveTime, setLabelReceiveTime] = useState<string | null>(null);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', address: '' });
  const [newCustomerErrors, setNewCustomerErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

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

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateRequired(newCustomerForm.name, 'Họ và tên');
    const phoneErr = validatePhone(newCustomerForm.phone, true);
    const addressErr = validateMaxLength(newCustomerForm.address, 500, 'Địa chỉ');
    const errs = { name: nameErr || undefined, phone: phoneErr || undefined, address: addressErr || undefined };
    setNewCustomerErrors(errs);
    if (nameErr || phoneErr || addressErr) return;
    try {
      const created = await createCustomer.mutateAsync({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim() || undefined,
        address: newCustomerForm.address.trim() || undefined,
      });
      setSelectedCustomer(created);
      setSearchTerm('');
      setShowCustomerList(false);
      setAddCustomerOpen(false);
      setNewCustomerForm({ name: '', phone: '', address: '' });
      setNewCustomerErrors({});
      showToast('Đã thêm khách hàng và chọn cho đơn hàng.', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      showToast('Vui lòng chọn khách hàng.', 'error');
      return;
    }
    const filled = items.filter(i => i.name.trim() !== '' || Number(i.price) > 0);
    if (filled.length === 0) {
      showToast('Vui lòng thêm ít nhất một sản phẩm (tên và đơn giá).', 'error');
      return;
    }
    for (let i = 0; i < filled.length; i++) {
      const item = filled[i];
      const nameErr = validateRequired(item.name, 'Tên sản phẩm');
      const priceErr = validateNumber(item.price, { min: 1, fieldName: 'Đơn giá' });
      if (nameErr || priceErr) {
        showToast(`Sản phẩm ${i + 1}: ${nameErr || priceErr}`, 'error');
        return;
      }
    }
    try {
      let return_time: string | null = null;
      if (returnDate) {
        const time = returnClock && returnClock.length > 0 ? returnClock : '18:00';
        const combined = new Date(`${returnDate}T${time}:00`);
        if (!Number.isNaN(combined.getTime())) {
          return_time = combined.toISOString();
        }
      }

      const created = await createOrder.mutateAsync({
        order: {
          customer_id: selectedCustomer.id,
          total_amount: totalAmount,
          status: 'New',
          return_time,
        } as Partial<Order>,
        items: items.filter(i => i.name.trim() !== '' && Number(i.price) > 0).map(i => ({
          name: i.name.trim(),
          price: Number(i.price),
          description: i.description?.trim() ?? '',
          assigned_tailor_id: i.assigned_tailor_id || null,
        })),
      });
      showToast('Đơn hàng đã được tạo thành công!', 'success');
      setLabelOrderId(created.id);
      setLabelItems(filled);
      setLabelCustomerName(selectedCustomer.name);
      setLabelReceiveTime(created.receive_time || null);
      setItems([]);
      setSelectedCustomer(null);
      setReturnDate('');
      setReturnClock('');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2 space-y-4 md:space-y-6">
        {/* Customer Selection */}
        <div className="vuexy-card p-4 md:p-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-bold text-foreground">Thông tin khách hàng</h4>
            <button
              type="button"
              onClick={() => {
                setAddCustomerOpen(true);
                setNewCustomerForm({ name: '', phone: '', address: '' });
                setNewCustomerErrors({});
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary/10 transition-colors"
            >
              <UserPlus size={16} /> Thêm khách hàng
            </button>
          </div>

          {selectedCustomer ? (
            <div className="space-y-3">
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

              {/* Return appointment (optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1">
                  <label htmlFor="pos-return-date" className="text-[11px] font-bold text-muted-foreground uppercase">Ngày hẹn trả (tùy chọn)</label>
                  <input
                    id="pos-return-date"
                    type="date"
                    className="w-full bg-muted/20 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="pos-return-clock" className="text-[11px] font-bold text-muted-foreground uppercase">Giờ hẹn trả</label>
                  <input
                    id="pos-return-clock"
                    type="time"
                    className="w-full bg-muted/20 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={returnClock}
                    onChange={e => setReturnClock(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Nếu bỏ trống giờ, hệ thống sẽ lấy mặc định 18:00.</p>
                </div>
              </div>
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

      {/* Add customer modal */}
      <Modal isOpen={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} title="Thêm khách hàng mới">
        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
          <div>
            <label htmlFor="pos-new-customer-name" className="block text-xs font-bold text-muted-foreground uppercase mb-1">Họ và tên *</label>
            <input
              id="pos-new-customer-name"
              className={`w-full bg-muted/20 border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary ${newCustomerErrors.name ? 'border-danger' : 'border-border'}`}
              value={newCustomerForm.name}
              onChange={e => { setNewCustomerForm({ ...newCustomerForm, name: e.target.value }); if (newCustomerErrors.name) setNewCustomerErrors({ ...newCustomerErrors, name: undefined }); }}
              placeholder="Nguyễn Văn A"
            />
            {newCustomerErrors.name && <p className="text-xs text-danger mt-0.5">{newCustomerErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="pos-new-customer-phone" className="block text-xs font-bold text-muted-foreground uppercase mb-1">Số điện thoại *</label>
            <input
              id="pos-new-customer-phone"
              className={`w-full bg-muted/20 border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary ${newCustomerErrors.phone ? 'border-danger' : 'border-border'}`}
              value={newCustomerForm.phone}
              onChange={e => { setNewCustomerForm({ ...newCustomerForm, phone: e.target.value }); if (newCustomerErrors.phone) setNewCustomerErrors({ ...newCustomerErrors, phone: undefined }); }}
              placeholder="0912345678"
            />
            {newCustomerErrors.phone && <p className="text-xs text-danger mt-0.5">{newCustomerErrors.phone}</p>}
          </div>
          <div>
            <label htmlFor="pos-new-customer-address" className="block text-xs font-bold text-muted-foreground uppercase mb-1">Địa chỉ</label>
            <input
              id="pos-new-customer-address"
              className={`w-full bg-muted/20 border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary ${newCustomerErrors.address ? 'border-danger' : 'border-border'}`}
              value={newCustomerForm.address}
              onChange={e => { setNewCustomerForm({ ...newCustomerForm, address: e.target.value }); if (newCustomerErrors.address) setNewCustomerErrors({ ...newCustomerErrors, address: undefined }); }}
              placeholder="Địa chỉ (tùy chọn)"
            />
            {newCustomerErrors.address && <p className="text-xs text-danger mt-0.5">{newCustomerErrors.address}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddCustomerOpen(false)} className="flex-1 py-2.5 rounded-md font-bold text-sm border border-border bg-muted/40 hover:bg-muted transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={createCustomer.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {createCustomer.isPending ? 'Đang tạo...' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Item labels print modal after creating order */}
      <Modal
        isOpen={labelOrderId != null && labelItems.length > 0}
        onClose={() => { setLabelOrderId(null); setLabelItems([]); setLabelCustomerName(null); setLabelReceiveTime(null); }}
        title={labelOrderId ? `In tem barcode đơn #${labelOrderId.toString().padStart(5, '0')}` : 'In tem barcode'}
        maxWidth="max-w-lg"
      >
        {labelOrderId != null && labelItems.length > 0 && (
          <ItemLabelsPrint
            orderId={labelOrderId}
            items={labelItems.map(i => ({ name: i.name, description: i.description }))}
            customerName={labelCustomerName ?? undefined}
            receiveTime={labelReceiveTime ?? undefined}
            onClose={() => { setLabelOrderId(null); setLabelItems([]); setLabelCustomerName(null); setLabelReceiveTime(null); }}
          />
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
