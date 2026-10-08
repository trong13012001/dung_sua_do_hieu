'use client';

import { memo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, CheckCircle2, Edit2, GripVertical, Package, PlayCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import { draggableIdOf, TASK_STATUS_LABEL, type TaskItem } from './taskBoard';

export type TaskCardOptions = {
  /** Hiện tên thợ / "Chưa phân công" (bảng Công việc chung). */
  showTailor?: boolean;
  /** Hiện mô tả món (bảng Việc của tôi). */
  showDescription?: boolean;
  onStatusChange: (taskId: number, status: string) => void;
  /** Có thì hiện nút "Phân công". */
  onAssign?: (task: TaskItem) => void;
};

/** Thẻ việc kéo thả được. memo: khi kéo, thư viện render lại liên tục — thẻ không đổi thì bỏ qua. */
export const TaskCard = memo(function TaskCard({
  task,
  index,
  showTailor,
  showDescription,
  onStatusChange,
  onAssign,
}: TaskCardOptions & { task: TaskItem; index: number }) {
  return (
    <Draggable draggableId={draggableIdOf(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xs transition-shadow hover:shadow-md',
            snapshot.isDragging && 'shadow-lg ring-2 ring-primary',
          )}
        >
          <div className="flex items-start gap-2">
            <div
              {...provided.dragHandleProps}
              aria-label="Kéo để đổi trạng thái"
              className="shrink-0 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            >
              <GripVertical size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-sm font-bold text-foreground">{task.item_name}</h3>
                <StatusBadge
                  kind="detail"
                  status={task.status}
                  label={TASK_STATUS_LABEL[task.status]}
                  className="px-1.5 text-[10px] uppercase"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Đơn #{String(task.orderNumber).padStart(5, '0')} · {task.customerName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                {task.orderCreatedAt && (
                  <span className="flex items-center gap-0.5">
                    <Calendar size={10} />
                    {new Date(task.orderCreatedAt).toLocaleDateString('vi-VN')}
                  </span>
                )}
                {showTailor &&
                  (task.tailor?.name ? (
                    <span className="flex items-center gap-0.5">
                      <UserCheck size={10} />
                      {task.tailor.name}
                    </span>
                  ) : (
                    <span className="italic text-warning">Chưa phân công</span>
                  ))}
              </div>
              {showDescription && task.description && (
                <p className="mt-0.5 line-clamp-2 text-[11px] italic text-muted-foreground/70">{task.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
            {onAssign && (
              <Button variant="outline" size="xs" onClick={() => onAssign(task)}>
                <Edit2 /> Phân công
              </Button>
            )}
            {task.status === 'New' && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => onStatusChange(task.id, 'In Progress')}
                className="border-warning/30 bg-warning/10 text-warning hover:bg-warning hover:text-white"
              >
                <PlayCircle /> Bắt đầu
              </Button>
            )}
            {(task.status === 'New' || task.status === 'In Progress') && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => onStatusChange(task.id, 'Ready')}
                className="border-success/30 bg-success/10 text-success hover:bg-success hover:text-white"
              >
                <CheckCircle2 /> Xong
              </Button>
            )}
            {task.status === 'Ready' && (
              <span className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-success">
                <Package size={11} />
                Chờ trả đồ
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});
