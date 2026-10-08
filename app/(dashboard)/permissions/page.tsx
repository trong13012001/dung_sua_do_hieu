'use client';

import React, { useCallback, useState } from 'react';
import { Key, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions, useCreatePermission, useUpdatePermission, useDeletePermission } from '@/api/permissions';
import { Permission } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListRowsSkeleton, TableRowsSkeleton } from '@/components/ui/loading-skeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { FormDialog } from '@/components/common/FormDialog';
import { FormField } from '@/components/common/FormField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { PermissionListItem, PermissionRow } from './_components/PermissionRow';

export default function PermissionsPage() {
  const { data: permissions, isLoading } = usePermissions();
  const { mutateAsync: createPerm, isPending: isCreating } = useCreatePermission();
  const { mutateAsync: updatePerm, isPending: isUpdating } = useUpdatePermission();
  const { mutateAsync: deletePerm, isPending: isDeleting } = useDeletePermission();

  // Cờ mở tách khỏi dữ liệu: khi đóng chỉ tắt cờ, nội dung giữ nguyên trong lúc animation đóng.
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [permName, setPermName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPerm, setDeletingPerm] = useState<Permission | null>(null);

  const openCreate = () => {
    setEditingPerm(null);
    setPermName('');
    setFormOpen(true);
  };

  const openEdit = useCallback((perm: Permission) => {
    setEditingPerm(perm);
    setPermName(perm.name);
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((perm: Permission) => {
    setDeletingPerm(perm);
    setDeleteOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPerm) {
        await updatePerm({ id: editingPerm.id, name: permName });
        toast.success('Cập nhật quyền thành công');
      } else {
        await createPerm(permName);
        toast.success('Tạo quyền thành công');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deletingPerm) return;
    try {
      await deletePerm(deletingPerm.id);
      setDeleteOpen(false);
      toast.success('Xóa quyền thành công');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const isEmpty = !isLoading && (!permissions || permissions.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý quyền hạn"
        actions={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus /> Thêm quyền
          </Button>
        }
      />

      {isEmpty ? (
        <EmptyState icon={Key} title="Chưa có quyền hạn nào." />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="px-6">ID</TableHead>
                  <TableHead className="px-6">Tên quyền</TableHead>
                  <TableHead className="px-6">Ngày tạo</TableHead>
                  <TableHead className="px-6 text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRowsSkeleton rows={6} cols={4} />
                ) : (
                  permissions!.map((perm) => (
                    <PermissionRow key={perm.id} perm={perm} onEdit={openEdit} onDelete={openDelete} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-border md:hidden">
            {isLoading ? (
              <ListRowsSkeleton rows={5} />
            ) : (
              permissions!.map((perm) => (
                <PermissionListItem key={perm.id} perm={perm} onEdit={openEdit} onDelete={openDelete} />
              ))
            )}
          </div>
        </Card>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingPerm ? 'Sửa quyền' : 'Thêm quyền'}
        onSubmit={handleSubmit}
        submitLabel={editingPerm ? 'Cập nhật' : 'Thêm'}
        isPending={isCreating || isUpdating}
      >
        <FormField label="Tên quyền" htmlFor="perm-name" hint="Viết liền, không dấu — vd: manage_inventory">
          <Input
            id="perm-name"
            required
            autoFocus
            placeholder="vd: manage_inventory"
            value={permName}
            onChange={(e) => setPermName(e.target.value)}
          />
        </FormField>
      </FormDialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa quyền"
        description={
          <>
            Bạn có chắc chắn muốn xóa quyền <span className="font-bold text-foreground">{deletingPerm?.name}</span>?
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
