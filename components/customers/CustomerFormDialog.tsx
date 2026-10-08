'use client';

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { FormDialog } from '@/components/common/FormDialog';
import { FormField } from '@/components/common/FormField';
import { validateMaxLength, validatePhone, validateRequired } from '@/lib/validation';

export type CustomerFormValues = { name: string; phone: string; address: string };
type Errors = Partial<Record<keyof CustomerFormValues, string>>;

const EMPTY: CustomerFormValues = { name: '', phone: '', address: '' };

/**
 * Form thêm / sửa khách (màn Khách hàng và POS). Tự giữ state và kiểm lỗi;
 * trang gọi đổi `key` mỗi lần mở để form bắt đầu lại từ `initial`.
 * `onSubmit` nhận giá trị đã trim (chuỗi rỗng → undefined); ném lỗi nếu lưu thất bại.
 */
export function CustomerFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  pendingLabel,
  initial = EMPTY,
  phoneRequired,
  isPending,
  onSubmit,
  idPrefix = 'customer',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  pendingLabel?: string;
  initial?: CustomerFormValues;
  phoneRequired: boolean;
  isPending: boolean;
  onSubmit: (values: { name: string; phone?: string; address?: string }) => Promise<void>;
  idPrefix?: string;
}) {
  const [values, setValues] = useState<CustomerFormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});

  const change = (key: keyof CustomerFormValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Errors = {
      name: validateRequired(values.name, 'Họ và tên') || undefined,
      phone: validatePhone(values.phone, phoneRequired) || undefined,
      address: validateMaxLength(values.address, 500, 'Địa chỉ') || undefined,
    };
    setErrors(next);
    if (next.name || next.phone || next.address) return;
    await onSubmit({
      name: values.name.trim(),
      phone: values.phone.trim() || undefined,
      address: values.address.trim() || undefined,
    });
  };

  const field = (key: keyof CustomerFormValues, label: string, placeholder: string, inputMode?: 'tel') => (
    <FormField label={label} htmlFor={`${idPrefix}-${key}`} error={errors[key]}>
      <Input
        id={`${idPrefix}-${key}`}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={!!errors[key]}
        value={values[key]}
        onChange={(e) => change(key, e.target.value)}
      />
    </FormField>
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      pendingLabel={pendingLabel}
      isPending={isPending}
    >
      {field('name', 'Họ và tên *', 'Nguyễn Văn A')}
      {field('phone', phoneRequired ? 'Số điện thoại *' : 'Số điện thoại', '0912345678', 'tel')}
      {field('address', 'Địa chỉ', 'Địa chỉ (tùy chọn)')}
    </FormDialog>
  );
}
