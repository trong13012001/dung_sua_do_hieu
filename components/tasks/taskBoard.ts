/** Cấu hình + kiểu dữ liệu dùng chung cho bảng Kanban (/tasks và /my-tasks). */

export const TASK_COLUMNS = [
  { id: 'New', label: 'Mới', headerClass: 'text-info border-info/30' },
  { id: 'In Progress', label: 'Đang làm', headerClass: 'text-warning border-warning/30' },
  { id: 'Ready', label: 'Đã xong', headerClass: 'text-success border-success/30' },
  { id: 'Completed', label: 'Hoàn thành', headerClass: 'text-secondary border-secondary/30' },
] as const;

export type TaskColumnDef = (typeof TASK_COLUMNS)[number];
export type TaskStatus = TaskColumnDef['id'];

/** Nhãn ngắn trên thẻ việc (khác nhãn dài ở form chi tiết đơn). */
export const TASK_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  TASK_COLUMNS.map((c) => [c.id, c.label]),
);

/** Dòng bảng Công việc — khớp `toTaskRow` trong api/orders.ts. */
export interface TaskItem {
  id: number;
  order_id: number;
  item_name: string;
  description: string | null;
  unit_price: number;
  status: string;
  assigned_tailor_id: string | null;
  tailor?: { id: string; name: string } | null;
  orderNumber: number;
  customerName: string;
  orderCreatedAt: string;
  orderStatus: string;
}

/** Chia thẻ theo cột trạng thái (một lượt duyệt). */
export function groupTasksByStatus<T extends { status: string }>(tasks: readonly T[]): Record<string, T[]> {
  const out: Record<string, T[]> = Object.fromEntries(TASK_COLUMNS.map((c) => [c.id, [] as T[]]));
  for (const t of tasks) out[t.status]?.push(t);
  return out;
}

export function taskStatusToast(status: string): string {
  if (status === 'In Progress') return 'Đã bắt đầu công việc';
  if (status === 'Ready') return 'Đã hoàn thành công việc';
  return 'Đã cập nhật trạng thái';
}

export const draggableIdOf = (taskId: number) => `task-${taskId}`;
export const taskIdOfDraggable = (draggableId: string) => Number(draggableId.replace('task-', ''));
