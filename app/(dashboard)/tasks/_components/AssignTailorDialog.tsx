'use client';

import { useState } from 'react';
import type { User } from '@/lib/types';
import type { TaskItem } from '@/components/tasks/taskBoard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/common/FormField';

/** Radix Select không nhận value rỗng → giá trị thay thế cho "chưa phân công". */
const UNASSIGNED = '__none__';

export function AssignTailorDialog({
  open,
  onOpenChange,
  task,
  tailors,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskItem | null;
  tailors: User[];
  isPending: boolean;
  onConfirm: (tailorId: string | null) => void;
}) {
  // Lựa chọn đang sửa, gắn với id thẻ — đổi thẻ là tự quay về thợ hiện tại của thẻ đó.
  const [draft, setDraft] = useState<{ taskId: number; value: string } | null>(null);
  const current = task?.assigned_tailor_id ? String(task.assigned_tailor_id) : UNASSIGNED;
  const value = draft && draft.taskId === task?.id ? draft.value : current;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    if (!next) setDraft(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Phân công thợ</DialogTitle>
          {task && (
            <DialogDescription asChild>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-bold text-foreground">{task.item_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Đơn #{String(task.orderNumber).padStart(5, '0')} · {task.customerName}
                </p>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <FormField label="Chọn thợ" htmlFor="assign-tailor">
          <Select value={value} onValueChange={(v) => task && setDraft({ taskId: task.id, value: v })}>
            <SelectTrigger id="assign-tailor" className="w-full">
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

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
            Huỷ
          </Button>
          <Button disabled={isPending || !task} onClick={() => onConfirm(value === UNASSIGNED ? null : value)}>
            {isPending ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
