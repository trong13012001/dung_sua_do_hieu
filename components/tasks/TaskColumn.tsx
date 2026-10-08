'use client';

import { memo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TaskCard, type TaskCardOptions } from './TaskCard';
import type { TaskColumnDef, TaskItem } from './taskBoard';

/** Một cột trạng thái của bảng Kanban. */
export const TaskColumn = memo(function TaskColumn({
  column,
  tasks,
  cappedAt,
  cardOptions,
}: {
  column: TaskColumnDef;
  tasks: TaskItem[];
  /** Cột đã chạm trần tải (TASK_STATUS_LIMIT) → ghi rõ "N mới nhất" (không giấu giới hạn). */
  cappedAt?: number;
  cardOptions: TaskCardOptions;
}) {
  return (
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            'min-h-[320px] gap-0 p-4 transition-colors',
            snapshot.isDraggingOver && 'bg-primary/5 ring-2 ring-primary/30',
          )}
        >
          <p className={cn('mb-3 border-b pb-2 text-xs font-bold uppercase tracking-wider', column.headerClass)}>
            {column.label} ({tasks.length})
            {cappedAt != null && (
              <span
                className="ml-1 font-medium normal-case text-muted-foreground"
                title={`Chỉ hiển thị ${cappedAt} món mới nhất của cột này. Gõ tên sản phẩm hoặc mã đơn vào ô tìm kiếm để tìm cả món cũ hơn.`}
              >
                · {cappedAt} mới nhất
              </span>
            )}
          </p>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} {...cardOptions} />
            ))}
            {provided.placeholder}
          </div>
        </Card>
      )}
    </Droppable>
  );
});
