'use client';

import React, { useCallback } from 'react';
import {
  Calendar,
  Package,
  Loader2,
  ClipboardList,
  GripVertical,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useOrderItems, useUpdateOrderDetail } from '@/api/orders';
import { Toast, useToast } from '@/components/ui/Toast';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useEmployees } from '@/api/users';
import { OrderDetail } from '@/lib/types';

const COLUMNS = [
  { id: 'New', label: 'Mới', color: 'bg-info/10 text-info border-info/20' },
  { id: 'In Progress', label: 'Đang làm', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'Ready', label: 'Đã xong', color: 'bg-success/10 text-success border-success/20' },
  { id: 'Completed', label: 'Hoàn thành', color: 'bg-secondary/10 text-secondary border-secondary/20' },
] as const;

const statusMap: Record<string, { label: string; color: string }> = {
  New: { label: 'Mới', color: 'bg-info/10 text-info' },
  'In Progress': { label: 'Đang làm', color: 'bg-warning/10 text-warning' },
  Ready: { label: 'Đã xong', color: 'bg-success/10 text-success' },
  Completed: { label: 'Hoàn thành', color: 'bg-secondary/10 text-secondary' },
};

export default function MyTasksPage() {
  const { isLoading: employeesLoading } = useEmployees();
  const currentUserId = useCurrentUserId();
  const updateDetail = useUpdateOrderDetail();
  const { toast, showToast, hideToast } = useToast();
  const { data: myTasks, isLoading: tasksLoading } = useOrderItems(currentUserId);

  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col.id] = (myTasks || []).filter((t: any) => t.status === col.id);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as OrderDetail['status'];
    const taskId = Number(draggableId.replace('task-', ''));
    const task = myTasks?.find((t: any) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await updateDetail.mutateAsync({
        id: taskId,
        detail: { status: newStatus },
      });
      const msg = newStatus === 'In Progress' ? 'Đã bắt đầu công việc' :
        newStatus === 'Ready' ? 'Đã hoàn thành công việc' :
          'Đã cập nhật trạng thái';
      showToast(msg, 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [myTasks, updateDetail, showToast]);

  const handleStatusUpdate = useCallback(async (detailId: number, status: string) => {
    try {
      await updateDetail.mutateAsync({ id: detailId, detail: { status: status as OrderDetail['status'] } });
      showToast(
        status === 'In Progress' ? 'Đã bắt đầu công việc' :
          status === 'Ready' ? 'Đã hoàn thành công việc' : 'Đã cập nhật trạng thái',
        'success'
      );
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [updateDetail, showToast]);

  if (employeesLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (currentUserId === null) {
    return (
      <div className="space-y-6">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Việc của tôi</h4>
        <div className="vuexy-card p-12 text-center border-2 border-dashed border-border shadow-none bg-transparent">
          <p className="text-muted-foreground italic">Không tìm thấy tài khoản thợ. Hãy đảm bảo email đăng nhập khớp với email trong hệ thống nhân viên.</p>
        </div>
      </div>
    );
  }

  const total = (myTasks || []).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Việc của tôi</h4>
        <p className="text-xs text-muted-foreground">Kéo thả thẻ giữa các cột — cập nhật đồng bộ mọi thiết bị (Realtime)</p>
      </div>

      {total === 0 ? (
        <div className="vuexy-card p-16 text-center flex flex-col items-center gap-3 bg-transparent border-2 border-dashed border-border shadow-none">
          <ClipboardList size={40} className="text-muted-foreground opacity-20" />
          <p className="text-muted-foreground italic">Hiện chưa có công việc nào được giao cho bạn.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`vuexy-card p-4 rounded-xl min-h-[320px] transition-colors ${snapshot.isDraggingOver ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-wider border-b pb-2 mb-3 ${col.color}`}>
                      {col.label} ({tasksByColumn[col.id]?.length ?? 0})
                    </p>
                    <div className="space-y-2">
                      {(tasksByColumn[col.id] || []).map((task: any, index: number) => {
                        const st = statusMap[task.status] || statusMap['New'];
                        return (
                          <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`vuexy-card p-3 flex flex-col gap-2 hover:shadow-md transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
                              >
                                <div className="flex items-start gap-2">
                                  <div {...provided.dragHandleProps} className="p-1 rounded text-muted-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing shrink-0">
                                    <GripVertical size={14} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                      <h5 className="font-bold text-foreground text-sm truncate">{task.item_name}</h5>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${st.color}`}>{st.label}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                      Đơn #{String(task.orderNumber).padStart(5, '0')} · {task.customerName}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                                      <span className="flex items-center gap-0.5">
                                        <Calendar size={10} />
                                        {task.orderCreatedAt ? new Date(task.orderCreatedAt).toLocaleDateString('vi-VN') : ''}
                                      </span>
                                    </div>
                                    {task.description && (
                                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic line-clamp-2">{task.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                                  {task.status === 'New' && (
                                    <button type="button" onClick={() => handleStatusUpdate(task.id, 'In Progress')} className="px-2 py-1 bg-warning/10 text-warning border border-warning/20 rounded text-[10px] font-bold hover:bg-warning hover:text-white">
                                      <PlayCircle size={10} className="inline mr-0.5" />Bắt đầu
                                    </button>
                                  )}
                                  {(task.status === 'New' || task.status === 'In Progress') && (
                                    <button type="button" onClick={() => handleStatusUpdate(task.id, 'Ready')} className="px-2 py-1 bg-success/10 text-success border border-success/20 rounded text-[10px] font-bold hover:bg-success hover:text-white">
                                      <CheckCircle2 size={10} className="inline mr-0.5" />Xong
                                    </button>
                                  )}
                                  {task.status === 'Ready' && (
                                    <span className="flex items-center gap-1 px-2 py-1 text-success text-[10px] font-bold">
                                      <Package size={10} />Chờ trả đồ
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
