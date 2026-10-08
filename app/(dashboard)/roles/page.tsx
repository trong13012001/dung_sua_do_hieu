'use client';

import React, { useCallback, useState } from 'react';
import { Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '@/api/roles';
import { usePermissions } from '@/api/permissions';
import { Role } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { FormDialog } from '@/components/common/FormDialog';
import { FormField } from '@/components/common/FormField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { RoleCard } from './_components/RoleCard';
import { RolePermissionsDialog } from './_components/RolePermissionsDialog';

export default function RolesPage() {
  const { data: roles, isLoading } = useRoles();
  const { data: permissions } = usePermissions();
  const { mutateAsync: createRole, isPending: isCreating } = useCreateRole();
  const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();
  const { mutateAsync: deleteRole, isPending: isDeleting } = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<Role | null>(null);

  const openCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setFormOpen(true);
  };

  const openEdit = useCallback((role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((role: Role) => {
    setDeletingRole(role);
    setDeleteOpen(true);
  }, []);

  const openPermissions = useCallback((role: Role) => {
    setPermRole(role);
    setPermOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateRole({ id: editingRole.id, name: roleName });
        toast.success('Cập nhật vai trò thành công');
      } else {
        await createRole(roleName);
        toast.success('Tạo vai trò thành công');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    try {
      await deleteRole(deletingRole.id);
      setDeleteOpen(false);
      toast.success('Xóa vai trò thành công');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý vai trò"
        actions={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus /> Thêm vai trò
          </Button>
        }
      />

      {!isLoading && (!roles || roles.length === 0) ? (
        <EmptyState icon={Shield} title="Chưa có vai trò nào." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {isLoading ? (
            <CardGridSkeleton count={3} />
          ) : (
            roles!.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={openEdit}
                onDelete={openDelete}
                onEditPermissions={openPermissions}
              />
            ))
          )}
        </div>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingRole ? 'Sửa vai trò' : 'Thêm vai trò'}
        onSubmit={handleSubmit}
        submitLabel={editingRole ? 'Cập nhật' : 'Thêm'}
        isPending={isCreating || isUpdating}
      >
        <FormField label="Tên vai trò" htmlFor="role-name">
          <Input
            id="role-name"
            required
            autoFocus
            placeholder="vd: manager"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />
        </FormField>
      </FormDialog>

      <RolePermissionsDialog open={permOpen} onOpenChange={setPermOpen} role={permRole} permissions={permissions} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa vai trò"
        description={
          <>
            Bạn có chắc chắn muốn xóa vai trò <span className="font-bold text-foreground">{deletingRole?.name}</span>? Tất
            cả nhân viên thuộc vai trò này sẽ mất liên kết.
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
