'use client';

import type { FormEvent } from 'react';
import type { Role } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormDialog } from '@/components/common/FormDialog';
import { FormField } from '@/components/common/FormField';

export type EmployeeForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  id_card: string;
  role_id: number;
};

/** Form tạo / sửa nhân viên. Chế độ tạo có thêm email đăng nhập + mật khẩu ban đầu. */
export function EmployeeFormDialog({
  open,
  onOpenChange,
  mode,
  form,
  onChange,
  roles,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  form: EmployeeForm;
  onChange: (patch: Partial<EmployeeForm>) => void;
  roles: Role[] | undefined;
  isPending: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const isCreate = mode === 'create';
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isCreate ? 'Tạo tài khoản nhân viên' : 'Sửa thông tin nhân viên'}
      onSubmit={onSubmit}
      submitLabel={isCreate ? 'Tạo tài khoản' : 'Cập nhật'}
      pendingLabel={isCreate ? 'Đang tạo...' : 'Đang lưu...'}
      isPending={isPending}
      className="sm:max-w-2xl"
    >
      <FormField label="Họ và tên *" htmlFor="emp-name">
        <Input
          id="emp-name"
          required
          autoFocus
          placeholder="Nguyễn Văn A"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </FormField>

      {isCreate && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email đăng nhập *" htmlFor="emp-email">
            <Input
              id="emp-email"
              required
              type="email"
              autoComplete="off"
              placeholder="nhanvien@email.com"
              value={form.email}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </FormField>
          <FormField label="Mật khẩu ban đầu *" htmlFor="emp-password">
            <Input
              id="emp-password"
              required
              type="password"
              minLength={6}
              autoComplete="new-password"
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChange={(e) => onChange({ password: e.target.value })}
            />
          </FormField>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Số điện thoại" htmlFor="emp-phone">
          <Input
            id="emp-phone"
            inputMode="tel"
            placeholder="091..."
            value={form.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </FormField>
        <FormField label={isCreate ? 'Vai trò *' : 'Vai trò'} htmlFor="emp-role">
          <Select value={String(form.role_id)} onValueChange={(v) => onChange({ role_id: Number(v) })}>
            <SelectTrigger id="emp-role" className="w-full">
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Địa chỉ" htmlFor="emp-address">
          <Input
            id="emp-address"
            placeholder="Hà Nội"
            value={form.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </FormField>
        <FormField label="CMND/CCCD" htmlFor="emp-id-card">
          <Input
            id="emp-id-card"
            placeholder="001..."
            value={form.id_card}
            onChange={(e) => onChange({ id_card: e.target.value })}
          />
        </FormField>
      </div>
    </FormDialog>
  );
}
