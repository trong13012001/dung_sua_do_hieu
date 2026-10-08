'use client';

import React, { useCallback, useState } from 'react';
import { KeyRound, Plus, UserPen } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useResetEmployeePassword } from '@/api/users';
import { useRoles } from '@/api/roles';
import { validateRequired, validateEmail, validatePassword, validatePhone } from '@/lib/validation';
import { errorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { EmployeeCard, type EmployeeWithRole } from './_components/EmployeeCard';
import { EmployeeFormDialog, type EmployeeForm } from './_components/EmployeeFormDialog';

const EMPTY_FORM: EmployeeForm = { name: '', email: '', password: '', phone: '', address: '', id_card: '', role_id: 1 };

/** Bỏ khoảng trắng thừa; chuỗi rỗng → undefined (giữ cách lưu cũ). */
const optional = (v: string) => v.trim() || undefined;

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const { data: roles } = useRoles();
  const { mutateAsync: createEmployee, isPending: isCreating } = useCreateEmployee();
  const { mutateAsync: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
  const { mutateAsync: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();
  const { mutateAsync: resetPassword, isPending: isResetting } = useResetEmployeePassword();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeWithRole | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEmp, setDeletingEmp] = useState<EmployeeWithRole | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resettingEmp, setResettingEmp] = useState<EmployeeWithRole | null>(null);

  const patchForm = useCallback((patch: Partial<EmployeeForm>) => setForm((f) => ({ ...f, ...patch })), []);

  const openCreate = () => {
    setEditingEmp(null);
    setForm({ ...EMPTY_FORM, role_id: roles?.[0]?.id || 1 });
    setFormOpen(true);
  };

  const openEdit = useCallback((emp: EmployeeWithRole) => {
    setEditingEmp(emp);
    setForm({
      ...EMPTY_FORM,
      name: emp.name,
      phone: emp.phone || '',
      address: emp.address || '',
      id_card: emp.id_card || '',
      role_id: emp.role_id || 1,
    });
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((emp: EmployeeWithRole) => {
    setDeletingEmp(emp);
    setDeleteOpen(true);
  }, []);

  const openReset = useCallback((emp: EmployeeWithRole) => {
    setResettingEmp(emp);
    setResetOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCreate = !editingEmp;
    const err =
      validateRequired(form.name, 'Họ và tên') ||
      (isCreate ? validateEmail(form.email) || validatePassword(form.password, 6) : null) ||
      validatePhone(form.phone, false);
    if (err) {
      toast.error(err);
      return;
    }
    const employee = {
      name: form.name.trim(),
      phone: optional(form.phone),
      address: optional(form.address),
      id_card: optional(form.id_card),
      role_id: form.role_id,
    };
    try {
      if (isCreate) {
        await createEmployee({ employee: { ...employee, email: form.email }, password: form.password });
        toast.success('Tạo tài khoản nhân viên thành công');
      } else {
        await updateEmployee({ id: editingEmp.id, employee });
        toast.success('Cập nhật nhân viên thành công');
      }
      setFormOpen(false);
    } catch (e) {
      toast.error('Lỗi: ' + errorMessage(e));
    }
  };

  const handleDelete = async () => {
    if (!deletingEmp) return;
    try {
      await deleteEmployee(deletingEmp.id);
      setDeleteOpen(false);
      toast.success('Xóa nhân viên thành công');
    } catch (e) {
      toast.error('Lỗi: ' + errorMessage(e));
    }
  };

  const handleResetPassword = async () => {
    if (!resettingEmp?.email) {
      toast.error('Nhân viên này chưa có email');
      setResetOpen(false);
      return;
    }
    try {
      await resetPassword(resettingEmp.email);
      setResetOpen(false);
      toast.success('Đã gửi email đặt lại mật khẩu');
    } catch (e) {
      toast.error('Lỗi: ' + errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý nhân viên"
        actions={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus /> Tạo tài khoản
          </Button>
        }
      />

      {!isLoading && (!employees || employees.length === 0) ? (
        <EmptyState icon={UserPen} title="Chưa có nhân viên nào." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {isLoading ? (
            <CardGridSkeleton count={6} variant="profile" />
          ) : (
            employees!.map((emp) => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                onEdit={openEdit}
                onResetPassword={openReset}
                onDelete={openDelete}
              />
            ))
          )}
        </div>
      )}

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editingEmp ? 'edit' : 'create'}
        form={form}
        onChange={patchForm}
        roles={roles}
        isPending={isCreating || isUpdating}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Đặt lại mật khẩu"
        description={
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-warning/20 bg-warning/5 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <KeyRound size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{resettingEmp?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{resettingEmp?.email}</p>
              </div>
            </div>
            <p>
              Hệ thống sẽ gửi email đặt lại mật khẩu đến{' '}
              <span className="font-bold text-foreground">{resettingEmp?.email}</span>.
            </p>
          </div>
        }
        confirmLabel="Gửi email đặt lại"
        pendingLabel="Đang gửi..."
        isPending={isResetting}
        onConfirm={handleResetPassword}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa nhân viên"
        description={
          <>
            Bạn có chắc chắn muốn xóa <span className="font-bold text-foreground">{deletingEmp?.name}</span>?
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
