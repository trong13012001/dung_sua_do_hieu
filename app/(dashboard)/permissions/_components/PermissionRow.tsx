'use client';

import { memo } from 'react';
import { Edit2, Key, Trash2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { IconAction } from '@/components/common/IconAction';
import type { Permission } from '@/lib/types';

type RowProps = {
  perm: Permission;
  onEdit: (perm: Permission) => void;
  onDelete: (perm: Permission) => void;
};

/** Dòng bảng (desktop). */
export const PermissionRow = memo(function PermissionRow({ perm, onEdit, onDelete }: RowProps) {
  return (
    <TableRow>
      <TableCell className="px-6 font-bold text-primary">#{perm.id}</TableCell>
      <TableCell className="px-6">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-primary" />
          <span className="font-medium text-foreground">{perm.name}</span>
        </div>
      </TableCell>
      <TableCell className="px-6 text-muted-foreground">
        {new Date(perm.created_at).toLocaleDateString('vi-VN')}
      </TableCell>
      <TableCell className="px-6">
        <div className="flex justify-end gap-1">
          <IconAction icon={Edit2} label="Sửa quyền" onClick={() => onEdit(perm)} />
          <IconAction icon={Trash2} label="Xoá quyền" tone="danger" onClick={() => onDelete(perm)} />
        </div>
      </TableCell>
    </TableRow>
  );
});

/** Dòng danh sách (mobile). */
export const PermissionListItem = memo(function PermissionListItem({ perm, onEdit, onDelete }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Key size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{perm.name}</p>
          <p className="text-[11px] text-muted-foreground">ID: {perm.id}</p>
        </div>
      </div>
      <div className="flex gap-1">
        <IconAction icon={Edit2} label="Sửa quyền" onClick={() => onEdit(perm)} />
        <IconAction icon={Trash2} label="Xoá quyền" tone="danger" onClick={() => onDelete(perm)} />
      </div>
    </div>
  );
});
