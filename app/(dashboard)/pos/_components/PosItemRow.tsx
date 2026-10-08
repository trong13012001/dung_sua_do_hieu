'use client';

import { memo } from 'react';
import { X } from 'lucide-react';
import type { Role, User } from '@/lib/types';
import { onlyDigits } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/common/FormField';

export interface PosItem {
  name: string;
  price: number;
  description: string;
  assigned_tailor_id: string;
}

/** Radix Select không nhận value rỗng → giá trị thay thế cho "chưa phân công". */
const UNASSIGNED = '__none__';

/** Một sản phẩm đang nhập ở POS. memo: gõ ở dòng này không render lại các dòng khác. */
export const PosItemRow = memo(function PosItemRow({
  index,
  item,
  tailors,
  onChange,
  onRemove,
}: {
  index: number;
  item: PosItem;
  tailors: (User & { role: Role | null })[];
  onChange: (index: number, field: keyof PosItem, value: string | number) => void;
  onRemove: (index: number) => void;
}) {
  const id = (f: string) => `pos-item-${index}-${f}`;
  return (
    <div className="relative rounded-lg border border-border bg-muted/20 p-3 md:p-4">
      <Button
        type="button"
        variant="destructive"
        size="icon-xs"
        onClick={() => onRemove(index)}
        aria-label={`Xoá sản phẩm ${index + 1}`}
        className="absolute -right-2 -top-2 rounded-full shadow-md"
      >
        <X />
      </Button>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <FormField label="Tên sản phẩm" htmlFor={id('name')}>
          <Input
            id={id('name')}
            className="bg-card"
            placeholder="vd: Sửa túi da"
            value={item.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
          />
        </FormField>
        <FormField label="Giá tiền" htmlFor={id('price')}>
          <Input
            id={id('price')}
            className="bg-card"
            inputMode="numeric"
            placeholder="0"
            value={item.price || ''}
            onChange={(e) => onChange(index, 'price', onlyDigits(e.target.value))}
          />
        </FormField>
        <FormField label="Mô tả" htmlFor={id('description')}>
          <Input
            id={id('description')}
            className="bg-card"
            placeholder="Ghi chú thêm..."
            value={item.description}
            onChange={(e) => onChange(index, 'description', e.target.value)}
          />
        </FormField>
        <FormField label="Phân công thợ" htmlFor={id('tailor')}>
          <Select
            value={item.assigned_tailor_id || UNASSIGNED}
            onValueChange={(v) => onChange(index, 'assigned_tailor_id', v === UNASSIGNED ? '' : v)}
          >
            <SelectTrigger id={id('tailor')} className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Chưa phân công</SelectItem>
              {tailors.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </div>
  );
});
