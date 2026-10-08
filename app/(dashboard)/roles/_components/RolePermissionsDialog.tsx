'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRolePermissions, useSetRolePermissions } from '@/api/roles';
import type { Permission, Role } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Chọn quyền cho một vai trò. `draft` = null nghĩa là chưa sửa gì → hiển thị đúng dữ liệu DB.
 * (Trước đây nạp bằng useEffect + setState; bấm Lưu khi quyền chưa tải xong sẽ ghi đè thành rỗng.)
 */
export function RolePermissionsDialog({
  open,
  onOpenChange,
  role,
  permissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  permissions: Permission[] | undefined;
}) {
  const { data: currentPerms, isLoading } = useRolePermissions(open ? role?.id ?? null : null);
  const { mutateAsync: setRolePermissions, isPending } = useSetRolePermissions();
  const [draft, setDraft] = useState<{ roleId: number; ids: number[] } | null>(null);

  const saved = useMemo(() => (currentPerms ?? []).map((rp) => rp.permission_id), [currentPerms]);
  const selected = draft && draft.roleId === role?.id ? draft.ids : saved;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (pid: number) => {
    if (!role) return;
    const next = selectedSet.has(pid) ? selected.filter((p) => p !== pid) : [...selected, pid];
    setDraft({ roleId: role.id, ids: next });
  };

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    if (!next) setDraft(null);
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!role) return;
    try {
      await setRolePermissions({ roleId: role.id, permissionIds: selected });
      toast.success('Cập nhật quyền thành công');
      handleOpenChange(false);
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Quyền: <span className="capitalize">{role?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Đã chọn {selected.length}/{permissions?.length ?? 0} quyền.
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)
            : permissions?.map((perm) => {
                const id = `perm-${perm.id}`;
                return (
                  <label
                    key={perm.id}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/5"
                  >
                    <Checkbox id={id} checked={selectedSet.has(perm.id)} onCheckedChange={() => toggle(perm.id)} />
                    <span className="text-sm font-medium text-foreground">{perm.name}</span>
                  </label>
                );
              })}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
            Huỷ
          </Button>
          <Button disabled={isPending || isLoading} onClick={handleSave}>
            {isPending ? 'Đang lưu...' : 'Lưu quyền'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
