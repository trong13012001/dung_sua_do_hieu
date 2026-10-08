'use client';

import React, { useCallback, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useGetCustomer } from '@/hooks/customer/useGetCustomer';
import { useCreateCustomer } from '@/hooks/customer/useCreateCustomer';
import { useUpdateCustomer } from '@/hooks/customer/useUpdateCustomer';
import { useDeleteCustomer } from '@/hooks/customer/useDeleteCustomer';
import { useDebounce } from '@/hooks/useDebounce';
import { Customer } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { CustomerCard } from './_components/CustomerCard';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  // Trang đếm từ 1 cho thống nhất với <Pagination> và các màn danh sách khác.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const { data: customerData, isLoading, isFetching } = useGetCustomer(page - 1, pageSize, debouncedSearchTerm);
  const customers = customerData?.data || [];
  const totalCount = customerData?.count || 0;

  const { mutateAsync: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutateAsync: updateCustomer, isPending: isUpdating } = useUpdateCustomer();
  const { mutateAsync: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();

  const [formOpen, setFormOpen] = useState(false);
  // Đổi key mỗi lần mở để form bắt đầu lại từ giá trị ban đầu.
  const [formKey, setFormKey] = useState(0);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const openCreate = () => {
    setEditingCustomer(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const openEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteOpen(true);
  }, []);

  const handleSubmit = async (values: { name: string; phone?: string; address?: string }) => {
    try {
      if (editingCustomer) {
        await updateCustomer({ id: editingCustomer.id, customer: values });
        toast.success('Cập nhật khách hàng thành công');
      } else {
        await createCustomer(values);
        toast.success('Thêm khách hàng thành công');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteCustomer(deletingCustomer.id);
      setDeleteOpen(false);
      toast.success('Xóa khách hàng thành công');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý khách hàng"
        actions={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus /> Thêm khách hàng
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          type="search"
          placeholder="Tìm theo tên, SĐT, địa chỉ..."
          className="h-11 bg-card pl-10"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {!isLoading && customers.length === 0 ? (
        <EmptyState icon={Users} title="Không tìm thấy khách hàng nào." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {isLoading ? (
            <CardGridSkeleton count={6} />
          ) : (
            customers.map((customer: Customer) => (
              <CustomerCard key={customer.id} customer={customer} onEdit={openEdit} onDelete={openDelete} />
            ))
          )}
        </div>
      )}

      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        pageSizeOptions={[9, 18, 36, 72]}
        isFetching={isFetching}
        unitLabel="khách hàng"
        className="mt-8"
      />

      <CustomerFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingCustomer ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng'}
        submitLabel={editingCustomer ? 'Cập nhật' : 'Thêm khách hàng'}
        pendingLabel={editingCustomer ? 'Đang lưu...' : 'Đang tạo...'}
        initial={
          editingCustomer
            ? { name: editingCustomer.name, phone: editingCustomer.phone || '', address: editingCustomer.address || '' }
            : undefined
        }
        phoneRequired={!editingCustomer}
        isPending={isCreating || isUpdating}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa khách hàng"
        description={
          <>
            Bạn có chắc chắn muốn xóa <span className="font-bold text-foreground">{deletingCustomer?.name}</span>? Hành
            động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.
          </>
        }
        confirmLabel="Xóa vĩnh viễn"
        pendingLabel="Đang xóa..."
        cancelLabel="Giữ lại"
        destructive
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
