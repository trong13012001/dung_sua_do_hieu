'use client';

import React, { useCallback, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { useOrderItems, useUpdateOrderDetail } from '@/api/orders';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useEmployees } from '@/api/users';
import { OrderDetail } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
import { KanbanSkeleton } from '@/components/ui/loading-skeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { TaskColumn } from '@/components/tasks/TaskColumn';
import type { TaskCardOptions } from '@/components/tasks/TaskCard';
import {
  groupTasksByStatus,
  TASK_COLUMNS,
  taskIdOfDraggable,
  taskStatusToast,
  type TaskItem,
} from '@/components/tasks/taskBoard';

const TITLE = 'Việc của tôi';

export default function MyTasksPage() {
  const { isLoading: employeesLoading } = useEmployees();
  const currentUserId = useCurrentUserId();
  const { mutateAsync: updateDetail } = useUpdateOrderDetail();
  const { data: myTasks, isLoading: tasksLoading } = useOrderItems(currentUserId);

  const tasks = useMemo<TaskItem[]>(() => myTasks ?? [], [myTasks]);
  const tasksByColumn = useMemo(() => groupTasksByStatus(tasks), [tasks]);

  const changeStatus = useCallback(
    async (taskId: number, status: string) => {
      try {
        await updateDetail({ id: taskId, detail: { status: status as OrderDetail['status'] } });
        toast.success(taskStatusToast(status));
      } catch (err) {
        toast.error('Lỗi: ' + errorMessage(err));
      }
    },
    [updateDetail],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, draggableId } = result;
      if (!destination) return;
      const taskId = taskIdOfDraggable(draggableId);
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === destination.droppableId) return;
      void changeStatus(taskId, destination.droppableId);
    },
    [tasks, changeStatus],
  );

  const cardOptions = useMemo<TaskCardOptions>(
    () => ({ showDescription: true, onStatusChange: changeStatus }),
    [changeStatus],
  );

  if (employeesLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={TITLE} />
        <KanbanSkeleton />
      </div>
    );
  }

  if (currentUserId === null) {
    return (
      <div className="space-y-6">
        <PageHeader title={TITLE} />
        <EmptyState
          icon={ClipboardList}
          title="Không tìm thấy tài khoản thợ."
          description="Hãy đảm bảo email đăng nhập khớp với email trong hệ thống nhân viên."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={TITLE}
        description="Kéo thả thẻ giữa các cột — cập nhật đồng bộ mọi thiết bị (Realtime)"
      />

      {tasks.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Hiện chưa có công việc nào được giao cho bạn." />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TASK_COLUMNS.map((col) => (
              <TaskColumn key={col.id} column={col} tasks={tasksByColumn[col.id]} cardOptions={cardOptions} />
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
