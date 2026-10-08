'use client';

import { memo } from 'react';
import Link from 'next/link';
import { DollarSign, Edit2, History, MapPin, Phone, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconAction } from '@/components/common/IconAction';
import type { Customer } from '@/lib/types';

const VND = new Intl.NumberFormat('vi-VN');

export const CustomerCard = memo(function CustomerCard({
  customer,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}) {
  const hasDebt = Number(customer.total_debt) > 0;
  return (
    <Card className="group justify-between gap-5 p-5 transition-shadow hover:shadow-md md:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users size={22} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className={
              hasDebt
                ? 'flex items-center gap-1 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive'
                : 'flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-bold text-muted-foreground'
            }
          >
            <DollarSign size={14} />
            Nợ: {VND.format(customer.total_debt)}
          </div>
          <div className="flex gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <IconAction icon={Edit2} label="Sửa khách hàng" onClick={() => onEdit(customer)} />
            <IconAction icon={Trash2} label="Xoá khách hàng" tone="danger" onClick={() => onDelete(customer)} />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold text-foreground">{customer.name}</h2>
        <div className="mt-3 space-y-2 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone size={14} className="shrink-0 text-primary" />
            {customer.phone || 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0 text-primary" />
            <span className="truncate">{customer.address || 'N/A'}</span>
          </div>
        </div>
      </div>

      <Button variant="outline" asChild className="w-full">
        <Link href={`/customers/${customer.id}/orders`}>
          <History /> Lịch sử đơn hàng
        </Link>
      </Button>
    </Card>
  );
});
