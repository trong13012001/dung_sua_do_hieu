"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { TASK_STATUS_LIMIT, useAllOrderItems, useUpdateOrderDetail } from "@/api/orders";
import { useEmployees } from "@/api/users";
import { useDebounce } from "@/hooks/useDebounce";
import { OrderDetail } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCardsSkeleton } from "@/components/ui/loading-skeletons";
import { PageHeader } from "@/components/common/PageHeader";
import { TaskColumn } from "@/components/tasks/TaskColumn";
import type { TaskCardOptions } from "@/components/tasks/TaskCard";
import {
    groupTasksByStatus,
    TASK_COLUMNS,
    taskIdOfDraggable,
    taskStatusToast,
    type TaskItem,
} from "@/components/tasks/taskBoard";
import { AssignTailorDialog } from "./_components/AssignTailorDialog";

/** Radix Select không nhận value rỗng. */
const ALL_TAILORS = "__all__";

export default function TasksPage() {
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);

    // Tìm kiếm chạy ở phía DB: bảng chỉ tải TASK_STATUS_LIMIT món mới nhất mỗi
    // cột, nên lọc phía client sẽ không bao giờ thấy món cũ.
    const { data: allTasks, isLoading } = useAllOrderItems(debouncedSearch);
    const { data: employees } = useEmployees();
    const { mutateAsync: updateDetail, isPending } = useUpdateOrderDetail();
    const [tailorFilter, setTailorFilter] = useState(ALL_TAILORS);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assigningTask, setAssigningTask] = useState<TaskItem | null>(null);

    const tailors = useMemo(
        () => (employees ?? []).filter((e) => e.role?.name === "Thợ may"),
        [employees],
    );

    const tasks = useMemo<TaskItem[]>(() => allTasks ?? [], [allTasks]);
    // Số món thật mỗi cột trước khi lọc theo thợ — để biết cột nào chạm trần TASK_STATUS_LIMIT.
    const rawByColumn = useMemo(() => groupTasksByStatus(tasks), [tasks]);
    const tasksByColumn = useMemo(
        () =>
            tailorFilter === ALL_TAILORS
                ? rawByColumn
                : groupTasksByStatus(tasks.filter((t) => String(t.assigned_tailor_id) === tailorFilter)),
        [tasks, rawByColumn, tailorFilter],
    );

    const changeStatus = useCallback(
        async (taskId: number, status: string) => {
            try {
                await updateDetail({ id: taskId, detail: { status: status as OrderDetail["status"] } });
                toast.success(taskStatusToast(status));
            } catch (err) {
                toast.error("Lỗi: " + errorMessage(err));
            }
        },
        [updateDetail],
    );

    const handleDragEnd = useCallback(
        (result: DropResult) => {
            const { source, destination } = result;
            if (!destination || source.droppableId === destination.droppableId) return;
            void changeStatus(taskIdOfDraggable(result.draggableId), destination.droppableId);
        },
        [changeStatus],
    );

    const openAssign = useCallback((task: TaskItem) => {
        setAssigningTask(task);
        setAssignOpen(true);
    }, []);

    const handleAssign = async (tailorId: string | null) => {
        if (!assigningTask) return;
        const assignee = tailorId == null ? null : tailors.find((t) => String(t.id) === tailorId);
        try {
            await updateDetail({
                id: assigningTask.id,
                detail: { assigned_tailor_id: tailorId },
                assignee_tailor: assignee ? { id: String(assignee.id), name: assignee.name } : null,
            });
            setAssignOpen(false);
            toast.success("Đã phân công thợ thành công");
        } catch (err) {
            toast.error("Lỗi: " + errorMessage(err));
        }
    };

    const cardOptions = useMemo<TaskCardOptions>(
        () => ({ showTailor: true, onStatusChange: changeStatus, onAssign: openAssign }),
        [changeStatus, openAssign],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Công việc sửa đồ"
                description="Kéo thả thẻ giữa các cột — cập nhật đồng bộ mọi thiết bị (Realtime)"
            />

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={16}
                    />
                    <Input
                        type="search"
                        placeholder="Tìm tên sản phẩm, mã đơn, tên khách..."
                        className="h-10 bg-card pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={tailorFilter} onValueChange={setTailorFilter}>
                    <SelectTrigger className="h-10 min-w-[170px] bg-card" aria-label="Lọc theo thợ">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_TAILORS}>Tất cả thợ</SelectItem>
                        {tailors.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                                {t.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {TASK_COLUMNS.map((col) => (
                        <Card key={col.id} className="gap-0 p-4">
                            <Skeleton className="mb-4 h-4 w-24" />
                            <TaskCardsSkeleton count={3} />
                        </Card>
                    ))}
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {TASK_COLUMNS.map((col) => (
                            <TaskColumn
                                key={col.id}
                                column={col}
                                tasks={tasksByColumn[col.id]}
                                cardOptions={cardOptions}
                                cappedAt={
                                    rawByColumn[col.id].length >= TASK_STATUS_LIMIT ? TASK_STATUS_LIMIT : undefined
                                }
                            />
                        ))}
                    </div>
                </DragDropContext>
            )}

            <AssignTailorDialog
                open={assignOpen}
                onOpenChange={setAssignOpen}
                task={assigningTask}
                tailors={tailors}
                isPending={isPending}
                onConfirm={handleAssign}
            />
        </div>
    );
}
