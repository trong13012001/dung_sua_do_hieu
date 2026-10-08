'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { useGetCustomer } from '@/hooks/customer/useGetCustomer';
import { useDebounce } from '@/hooks/useDebounce';
import type { Customer } from '@/lib/types';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

/**
 * Ô tìm + chọn khách ở POS. Tìm ở phía DB (tên, SĐT, địa chỉ); cmdk lo phím ↑ ↓ Enter.
 * `shouldFilter={false}` vì kết quả đã lọc sẵn từ server.
 */
export function CustomerPicker({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(term, 400);
  const { data, isFetching } = useGetCustomer(0, 100, debounced);
  const customers = data?.data ?? [];

  const pick = (c: Customer) => {
    onSelect(c);
    setTerm('');
    setOpen(false);
  };

  return (
    <Command
      shouldFilter={false}
      className="relative overflow-visible rounded-md border border-input bg-card shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
    >
      <CommandInput
        value={term}
        onValueChange={(v) => {
          setTerm(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Trễ một nhịp để cú bấm vào item kịp chạy trước khi danh sách đóng.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Tìm theo tên, SĐT hoặc địa chỉ khách hàng..."
        className="h-10"
      />
      {open && (
        <CommandList className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[300px] rounded-lg border border-border bg-popover shadow-lg">
          <CommandEmpty className="px-4 py-6 text-center text-sm italic text-muted-foreground">
            {isFetching ? 'Đang tìm...' : term ? 'Không tìm thấy khách hàng' : 'Nhập tên, SĐT hoặc địa chỉ để tìm'}
          </CommandEmpty>
          {customers.map((c: Customer) => (
            <CommandItem
              key={c.id}
              value={String(c.id)}
              onSelect={() => pick(c)}
              className="gap-3 rounded-none border-b border-border/50 px-4 py-3 last:border-none"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users size={14} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.phone || 'Không có SĐT'} {c.address ? `· ${c.address}` : ''}
                </p>
              </div>
            </CommandItem>
          ))}
        </CommandList>
      )}
    </Command>
  );
}
