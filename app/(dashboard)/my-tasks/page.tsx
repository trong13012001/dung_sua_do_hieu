'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Package,
  Loader2,
  ClipboardList,
  GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useOrderItems, useUpdateOrderDetail } from '@/api/orders';
import { Toast, useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useEmployees } from '@/api/users';
import { OrderDetail, User, Role } from '@/lib/types';

type ColumnId = 'New' | 'In Progress' | 'Ready';

const columns: { id: ColumnId; label: string; dot: string; headerBg: string }[] = [
  { id: 'New', label: 'Mới', dot: 'bg-info', headerBg: 'border-info/30' },
  { id: 'In Progress', label: 'Đang làm', dot: 'bg-warning', headerBg: 'border-warning/30' },
  { id: 'Ready', label: 'Đã xong', dot: 'bg-success', headerBg: 'border-success/30' },
];

const statusColors: Record<string, string> = {
  'New': 'bg-info/10 text-info',
  'In Progress': 'bg-warning/10 text-warning',
  'Ready': 'bg-success/10 text-success',
};

export default function MyTasksPage() {
  const { data: employees } = useEmployees();
  const updateDetail = useUpdateOrderDetail();
  const { toast, showToast, hideToast } = useToast();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function findCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && employees) {
        const match = employees.find((e: User & { role: Role | null }) => e.email === user.email);
        if (match) setCurrentUserId(match.id);
      }
      setLoadingUser(false);
    }
    if (employees) findCurrentUser();
  }, [employees]);

  const { data: myTasks, isLoading: tasksLoading } = useOrderItems(currentUserId);

  const getTasksByStatus = useCallback((status: ColumnId) => {
    return myTasks?.filter((t: any) => t.status === status) || [];
  }, [myTasks]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as ColumnId;
    const taskId = Number(draggableId);
    const task = myTasks?.find((t: any) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await updateDetail.mutateAsync({
        id: taskId,
        detail: { status: newStatus as OrderDetail['status'] },
      });
      const msg = newStatus === 'In Progress' ? 'Đã bắt đầu công việc' :
                  newStatus === 'Ready' ? 'Đã hoàn thành công việc' :
                  'Đã cập nhật trạng thái';
      showToast(msg, 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [myTasks, updateDetail, showToast]);

  if (loadingUser || tasksLoading) {
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
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          {columns.map(col => (
            <span key={col.id} className={`px-2.5 py-1 rounded-md ${statusColors[col.id]}`}>
              {col.label}: {getTasksByStatus(col.id).length}
            </span>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="vuexy-card p-16 text-center flex flex-col items-center gap-3 bg-transparent border-2 border-dashed border-border shadow-none">
          <ClipboardList size={40} className="text-muted-foreground opacity-20" />
          <p className="text-muted-foreground italic">Hiện chưa có công việc nào được giao cho bạn.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {columns.map(col => {
              const tasks = getTasksByStatus(col.id);
              return (
                <div key={col.id} className="space-y-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${col.headerBg}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h5 className="text-sm font-bold text-foreground">{col.label}</h5>
                    <span className="text-xs text-muted-foreground ml-auto">{tasks.length}</span>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[120px] rounded-lg p-2 transition-colors space-y-2 ${
                          snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-muted/5'
                        }`}
                      >
                        {tasks.length > 0 ? tasks.map((task: any, index: number) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`vuexy-card p-3.5 transition-shadow select-none ${
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30 rotate-1' : 'hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
                                  >
                                    <GripVertical size={16} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h6 className="font-bold text-foreground text-sm leading-tight">{task.item_name}</h6>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                      Đơn #{String(task.orderNumber).padStart(5, '0')} · {task.customerName}
                                    </p>
                                    {task.description && (
                                      <p className="text-[11px] text-muted-foreground/60 mt-0.5 italic line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                                        <Calendar size={10} />
                                        {task.orderCreatedAt ? new Date(task.orderCreatedAt).toLocaleDateString('vi-VN') : ''}
                                      </span>
                                      {col.id === 'Ready' && (
                                        <span className="text-[10px] text-success font-bold flex items-center gap-1">
                                          <Package size={10} />Chờ trả
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )) : (
                          <div className="p-8 text-center text-xs text-muted-foreground/50 italic">
                            Kéo thả công việc vào đây
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
