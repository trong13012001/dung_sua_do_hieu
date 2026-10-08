'use client';

import { memo } from 'react';
import { CreditCard, Edit2, KeyRound, Mail, MapPin, Phone, ShieldCheck, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconAction } from '@/components/common/IconAction';
import type { Role, User } from '@/lib/types';

export type EmployeeWithRole = User & { role: Role | null };

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export const EmployeeCard = memo(function EmployeeCard({
  emp,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  emp: EmployeeWithRole;
  onEdit: (emp: EmployeeWithRole) => void;
  onResetPassword: (emp: EmployeeWithRole) => void;
  onDelete: (emp: EmployeeWithRole) => void;
}) {
  return (
    <Card className="group relative items-center gap-0 p-5 text-center transition-shadow hover:shadow-md md:p-6">
      <div className="absolute right-3 top-3 flex gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <IconAction icon={Edit2} label="Sửa" onClick={() => onEdit(emp)} />
        {emp.email && (
          <IconAction icon={KeyRound} label="Đặt lại mật khẩu" tone="warning" onClick={() => onResetPassword(emp)} />
        )}
        <IconAction icon={Trash2} label="Xoá" tone="danger" onClick={() => onDelete(emp)} />
      </div>

      <div className="mb-3 flex size-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-lg font-bold text-primary md:size-20 md:text-xl">
        {initialsOf(emp.name)}
      </div>

      <h2 className="text-base font-bold text-foreground md:text-lg">{emp.name}</h2>
      {emp.role?.name && (
        <Badge variant="ghost" className="mt-1 bg-primary/10 font-bold uppercase tracking-wider text-primary">
          <ShieldCheck /> {emp.role.name}
        </Badge>
      )}

      <div className="mt-4 w-full space-y-1.5 text-xs font-medium text-foreground/70">
        {emp.email && (
          <div className="flex items-center justify-center gap-2">
            <Mail size={13} className="shrink-0 text-primary" />
            <span className="max-w-[200px] truncate">{emp.email}</span>
          </div>
        )}
        <div className="flex items-center justify-center gap-2">
          <Phone size={13} className="shrink-0 text-primary" />
          {emp.phone || 'N/A'}
        </div>
        {emp.address && (
          <div className="flex items-center justify-center gap-2">
            <MapPin size={13} className="shrink-0 text-primary" />
            {emp.address}
          </div>
        )}
        {emp.id_card && (
          <div className="flex items-center justify-center gap-2">
            <CreditCard size={13} className="shrink-0 text-primary" />
            {emp.id_card}
          </div>
        )}
      </div>
    </Card>
  );
});
