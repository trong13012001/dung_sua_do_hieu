'use client';

import { useState } from 'react';
import type { Order, Role, User } from '@/lib/types';
import { returnTimeToDateInputValue } from '@/lib/canPrintInvoice';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EditOrderForm } from './EditOrderForm';
import { OrderLogSection } from './OrderLogSection';
import { ORDER_STATUS_OPTIONS } from './orderStatusOptions';
import { useOrderEditActions } from './useOrderEditActions';

/**
 * Hộp thoại "Cập nhật đơn" dùng chung (màn Đơn hàng + Lịch sử đơn của khách).
 * Trang gọi đổi `key` mỗi lần mở để form dựng lại từ `order`.
 */
export function EditOrderDialog({
  open,
  onOpenChange,
  order: initialOrder,
  tailors,
  currentUserId,
  withReturnDate = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  tailors: (User & { role: Role | null })[];
  currentUserId: string | null;
  /** Bật ô "Ngày hẹn trả đồ". */
  withReturnDate?: boolean;
}) {
  // Bản đơn đang sửa — bớt dòng ngay khi xoá một món để form không còn hiện món đó.
  const [order, setOrder] = useState(initialOrder);
  const [deletingDetailId, setDeletingDetailId] = useState<number | null>(null);
  const { submitEdit, removeDetail, isSaving, isDeletingDetail } = useOrderEditActions(currentUserId);

  const handleSubmit = async (data: Parameters<typeof submitEdit>[1]) => {
    if (!order) return;
    if (await submitEdit(order, data)) onOpenChange(false);
  };

  const handleDeleteDetail = async () => {
    if (!order || deletingDetailId == null) return;
    const next = await removeDetail(order, deletingDetailId);
    if (next) {
      setOrder(next);
      setDeletingDetailId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!isSaving) onOpenChange(next); }}>
        <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cập nhật đơn #{order?.id}</DialogTitle>
          </DialogHeader>
          {order && (
            <EditOrderForm
              order={order}
              tailors={tailors}
              statusOptions={ORDER_STATUS_OPTIONS}
              isPending={isSaving}
              logSlot={<OrderLogSection orderId={order.id} />}
              returnDate={withReturnDate ? { initial: returnTimeToDateInputValue(order.return_time) } : undefined}
              onCancel={() => onOpenChange(false)}
              onRequestDeleteDetail={setDeletingDetailId}
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingDetailId !== null}
        onOpenChange={(next) => { if (!next) setDeletingDetailId(null); }}
        title="Xóa dòng sản phẩm"
        description="Bạn có chắc muốn xóa dòng sản phẩm này?"
        confirmLabel="Xóa"
        pendingLabel="Đang xóa..."
        destructive
        isPending={isDeletingDetail}
        onConfirm={handleDeleteDetail}
      />
    </>
  );
}
