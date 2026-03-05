'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  MapPin,
  DollarSign,
  History,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useGetCustomer } from '@/hooks/customer/useGetCustomer';
import { useCreateCustomer } from '@/hooks/customer/useCreateCustomer';
import { useUpdateCustomer } from '@/hooks/customer/useUpdateCustomer';
import { useDeleteCustomer } from '@/hooks/customer/useDeleteCustomer';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import { Customer } from '@/lib/types';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const router = useRouter();
  const [page, setPage] = useState(0);
  const pageSize = 9;
  const { data: customerData, isLoading } = useGetCustomer(page, pageSize, debouncedSearchTerm);
  const customers = customerData?.data || [];
  const totalCount = customerData?.count || 0;

  // Reset page when search term changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm]);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { toast, showToast, hideToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCustomer.mutateAsync(formData);
      setIsAdding(false);
      setFormData({ name: '', phone: '', address: '' });
      showToast('Thêm khách hàng thành công', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, customer: formData });
      }
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', address: '' });
      showToast('Cập nhật khách hàng thành công', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteCustomer.mutateAsync(deletingCustomer.id);
      setDeletingCustomer(null);
      showToast('Xóa khách hàng thành công', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone || '', address: customer.address || '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Quản lý khách hàng</h4>
        <button
          onClick={() => {
            setIsAdding(true);
            setFormData({ name: '', phone: '', address: '' });
          }}
          className="w-full sm:w-auto btn-primary px-5 py-2 md:py-2.5 rounded-md font-bold text-sm"
        >
          Thêm khách hàng
        </button>
      </div>

      <div className="vuexy-card p-3 md:p-4 flex items-center gap-3 md:gap-4">
        <Search className="text-muted-foreground shrink-0" size={18} />
        <input
          type="text"
          placeholder="Tìm kiếm khách hàng..."
          className="bg-transparent border-none outline-none w-full text-xs md:text-sm text-foreground"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="vuexy-card h-56 animate-pulse"></div>
          ))
        ) : customers && customers.length > 0 ? (
          customers.map((customer: Customer) => (
            <div key={customer.id} className="vuexy-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Users size={24} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-danger font-bold text-xs bg-danger/10 px-2 py-0.5 rounded-md border border-danger/20">
                    <DollarSign size={14} />
                    Nợ: {new Intl.NumberFormat('vi-VN').format(customer.total_debt)}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(customer)}
                      className="p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingCustomer(customer)}
                      className="p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-lg font-bold text-foreground">{customer.name}</h5>
                <div className="space-y-2 mt-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-primary" />
                    {customer.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-primary" />
                    {customer.address || 'N/A'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push(`/customers/${customer.id}/orders`)}
                className="mt-6 md:mt-8 w-full bg-muted/40 text-foreground hover:bg-muted py-2 md:py-2.5 rounded-md text-[10px] md:text-[11px] font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest border border-border"
              >
                <History size={14} />
                Lịch sử đơn hàng
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-muted-foreground bg-transparent border-2 border-dashed border-border rounded-lg italic">
            Không tìm thấy khách hàng nào.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="p-2 rounded-md border border-border bg-card text-foreground disabled:opacity-50 hover:bg-muted transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Trang {page + 1} trên {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="p-2 rounded-md border border-border bg-card text-foreground disabled:opacity-50 hover:bg-muted transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAdding || !!editingCustomer}
        onClose={() => {
          setIsAdding(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng'}
      >
        <form onSubmit={editingCustomer ? handleUpdate : handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Họ và tên</label>
            <input
              required
              placeholder="Nguyễn Văn A"
              className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Số điện thoại</label>
            <input
              required
              placeholder="091..."
              className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm transition-all"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Địa chỉ</label>
            <input
              placeholder="Hà Nội, Việt Nam"
              className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm transition-all"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="flex gap-4 mt-10">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingCustomer(null);
              }}
              className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending || updateCustomer.isPending}
              className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(createCustomer.isPending || updateCustomer.isPending) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {editingCustomer
                ? (updateCustomer.isPending ? 'Đang lưu...' : 'Cập nhật')
                : (createCustomer.isPending ? 'Đang tạo...' : 'Thêm khách hàng')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        title="Xóa khách hàng"
      >
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Bạn có chắc chắn muốn xóa <span className="font-bold text-foreground">{deletingCustomer?.name}</span>?
            Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setDeletingCustomer(null)}
              className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border hover:bg-muted transition-colors"
            >
              Giữ lại
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteCustomer.isPending}
              className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleteCustomer.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {deleteCustomer.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
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
