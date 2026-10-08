'use client';

import { memo } from 'react';
import { Edit2, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconAction } from '@/components/common/IconAction';
import type { Role } from '@/lib/types';

export const RoleCard = memo(function RoleCard({
  role,
  onEdit,
  onDelete,
  onEditPermissions,
}: {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onEditPermissions: (role: Role) => void;
}) {
  return (
    <Card className="group gap-4 p-5 transition-shadow hover:shadow-md md:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold capitalize text-foreground">{role.name}</h2>
            <p className="text-[11px] text-muted-foreground">ID: {role.id}</p>
          </div>
        </div>
        {/* Màn cảm ứng không có hover → luôn hiện; desktop hiện khi rê chuột hoặc focus bàn phím. */}
        <div className="flex gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <IconAction icon={Edit2} label="Sửa vai trò" onClick={() => onEdit(role)} />
          <IconAction icon={Trash2} label="Xoá vai trò" tone="danger" onClick={() => onDelete(role)} />
        </div>
      </div>
      <Button variant="outline" onClick={() => onEditPermissions(role)} className="w-full">
        <Shield /> Phân quyền
      </Button>
    </Card>
  );
});
