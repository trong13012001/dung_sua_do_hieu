'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  PlayCircle,
  Scissors,
  Calendar,
  Search,
  ChevronDown,
  UserCheck,
  Package,
  Edit2,
  GripVertical,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAllOrderItems, useUpdateOrderDetail } from '@/api/orders';
import { useEmployees } from '@/api/users';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import { OrderDetail, User, Role } from '@/lib/types';

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

interface TaskItem {
  id: number;
  order_id: number;
  item_name: string;
  description: string;
  unit_price: number;
  status: string;
  assigned_tailor_id: string | null;
  tailor?: { id: number; name: string } | null;
  orderNumber: number;
  customerName: string;
  orderCreatedAt: string;
  orderStatus: string;
}

export default function TasksPage() {
  const { data: allTasks, isLoading } = useAllOrderItems();
  const { data: employees } = useEmployees();
  const updateDetail = useUpdateOrderDetail();
  const { toast, showToast, hideToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [tailorFilter, setTailorFilter] = useState('');
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTailorId, setEditTailorId] = useState('');

  const tailors = employees?.filter((e: User & { role: Role | null }) =>
    e.role?.name === 'Thợ may'
  ) || [];

  const tasks = allTasks || [];

  const filteredTasks = tasks.filter((t: TaskItem) => {
    const matchSearch = !debouncedSearch ||
      t.orderNumber.toString().includes(debouncedSearch) ||
      t.item_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.customerName.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchTailor = !tailorFilter || String(t.assigned_tailor_id) === tailorFilter;
    return matchSearch && matchTailor;
  });

  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredTasks.filter((t: TaskItem) => t.status === col.id);
    return acc;
  }, {} as Record<string, TaskItem[]>);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const taskId = Number(result.draggableId.replace('task-', ''));
    const task = filteredTasks.find((t: TaskItem) => t.id === taskId);
    if (!task || !destination.droppableId) return;
    const newStatus = destination.droppableId as OrderDetail['status'];
    try {
      await updateDetail.mutateAsync({ id: task.id, detail: { status: newStatus } });
      showToast('Đã cập nhật trạng thái', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  const handleStatusUpdate = async (detailId: number, status: string) => {
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
  };

  const handleReassign = async () => {
    if (!editingTask) return;
    try {
      await updateDetail.mutateAsync({
        id: editingTask.id,
        detail: { assigned_tailor_id: editTailorId === '' ? null : editTailorId },
      });
      setEditingTask(null);
      showToast('Đã phân công thợ thành công', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Công việc sửa đồ</h4>
        <p className="text-xs text-muted-foreground">Kéo thả thẻ giữa các cột — cập nhật đồng bộ mọi thiết bị (Realtime)</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input type="text" placeholder="Tìm tên sản phẩm, mã đơn, tên khách..." className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="relative">
          <select className="bg-card border border-border rounded-md px-4 py-2.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary pr-10 min-w-[150px]" value={tailorFilter} onChange={e => setTailorFilter(e.target.value)}>
            <option value="">Tất cả thợ</option>
            {tailors.map((t: User & { role: Role | null }) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="vuexy-card p-4 rounded-xl">
              <p className={`text-xs font-bold uppercase tracking-wider border-b pb-2 mb-3 ${col.color}`}>{col.label}</p>
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/20 rounded-lg animate-pulse" />)}
              </div>
            </div>
          ))}
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
                      {(tasksByColumn[col.id] || []).map((task: TaskItem, index: number) => {
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
                                      Đơn #{task.orderNumber.toString().padStart(5, '0')} · {task.customerName}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                                      <span className="flex items-center gap-0.5"><Calendar size={10} />{new Date(task.orderCreatedAt).toLocaleDateString('vi-VN')}</span>
                                      {task.tailor?.name ? (
                                        <span className="flex items-center gap-0.5"><UserCheck size={10} />{task.tailor.name}</span>
                                      ) : (
                                        <span className="text-warning italic">Chưa phân công</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                                  <button
                                    type="button"
                                    onClick={() => { setEditingTask(task); setEditTailorId(String(task.assigned_tailor_id || '')); }}
                                    className="px-2 py-1 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border rounded text-[10px] font-bold"
                                  >
                                    <Edit2 size={10} className="inline mr-0.5" />Phân công
                                  </button>
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

      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Phân công thợ">
        <div className="space-y-5">
          {editingTask && (
            <div className="p-4 bg-muted/10 border border-border rounded-lg">
              <p className="text-sm font-bold text-foreground">{editingTask.item_name}</p>
              <p className="text-xs text-muted-foreground mt-1">Đơn #{editingTask.orderNumber.toString().padStart(5, '0')} · {editingTask.customerName}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Chọn thợ</label>
            <div className="relative">
              <select className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary" value={editTailorId} onChange={e => setEditTailorId(e.target.value)}>
                <option value="">Chưa phân công</option>
                {tailors.map((t: User & { role: Role | null }) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setEditingTask(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Hủy</button>
            <button type="button" onClick={handleReassign} disabled={updateDetail.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">{updateDetail.isPending ? 'Đang lưu...' : 'Xác nhận'}</button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
