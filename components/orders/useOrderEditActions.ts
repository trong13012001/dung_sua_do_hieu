'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  useAddOrderDetails,
  useDeleteOrderDetail,
  useUpdateOrder,
  useUpdateOrderDetail,
  type NewOrderDetailItem,
} from '@/api/orders';
import type { Order, OrderDetail } from '@/lib/types';
import { validateNumber } from '@/lib/validation';
import { dateInputToReturnTime, returnTimeToDateInputValue } from '@/lib/canPrintInvoice';
import { errorMessage } from '@/lib/utils';
import type { EditOrderSubmitData } from './EditOrderForm';

/**
 * Lưu form "Cập nhật đơn" (trạng thái đơn, ngày hẹn trả, sửa / thêm món) và xoá một dòng món.
 * Dùng chung cho màn Đơn hàng và màn Lịch sử đơn của khách — trước đây mỗi màn chép một bản.
 * Trả về `true` khi lưu xong để trang đóng hộp thoại.
 */
export function useOrderEditActions(currentUserId: string | null) {
  const { mutateAsync: updateOrder, isPending: isUpdatingOrder } = useUpdateOrder();
  const { mutateAsync: updateDetail, isPending: isUpdatingDetail } = useUpdateOrderDetail();
  const { mutateAsync: addDetails, isPending: isAddingDetails } = useAddOrderDetails();
  const { mutateAsync: deleteDetail, isPending: isDeletingDetail } = useDeleteOrderDetail();
  const updatedBy = currentUserId ?? undefined;

  const submitEdit = useCallback(
    async (order: Order, data: EditOrderSubmitData): Promise<boolean> => {
      const { detailEdits, newItems } = data;
      const orderStatusChoice = data.orderStatusChoice || order.status;

      // Kiểm tra trước khi ghi bất cứ thứ gì.
      if (orderStatusChoice === 'Completed' && order.status !== 'Completed') {
        if (order.total_amount - (order.paid_amount || 0) > 0) {
          toast.error('Chỉ hoàn thành đơn khi đã thu đủ tiền (còn nợ trên đơn).');
          return false;
        }
      }
      for (const detail of order.details || []) {
        const edit = detailEdits[detail.id];
        if (!edit) continue;
        const priceNum = Number(edit.unit_price);
        if (edit.unit_price.trim() !== '' && (Number.isNaN(priceNum) || priceNum < 0)) {
          toast.error(`Sản phẩm "${edit.item_name || detail.item_name}": Đơn giá không hợp lệ`);
          return false;
        }
      }
      for (let i = 0; i < newItems.length; i += 1) {
        const row = newItems[i];
        const hasName = row.name.trim() !== '';
        const priceErr = validateNumber(row.price, { min: 0, required: hasName, fieldName: 'Đơn giá' });
        if (hasName && priceErr) {
          toast.error(`Dòng ${i + 1} (${row.name.trim()}): ${priceErr}`);
          return false;
        }
        if (!hasName && row.price.trim() !== '' && Number(row.price) > 0) {
          toast.error(`Dòng ${i + 1}: Nhập tên sản phẩm`);
          return false;
        }
      }

      try {
        // Đơn: trạng thái + ngày hẹn trả (chỉ khi form có ô ngày hẹn trả).
        const origReturnYmd = returnTimeToDateInputValue(order.return_time);
        const returnDateInput = data.returnDate ?? origReturnYmd;
        const orderPatch: Partial<Order> = {};
        if (orderStatusChoice && orderStatusChoice !== order.status) {
          orderPatch.status = orderStatusChoice as Order['status'];
        }
        if (returnDateInput !== origReturnYmd) {
          orderPatch.return_time = dateInputToReturnTime(returnDateInput);
        }
        if (Object.keys(orderPatch).length > 0) {
          await updateOrder({ id: order.id, order: orderPatch, updated_by: updatedBy });
        }

        // Các món đã có.
        for (const detail of order.details || []) {
          const edit = detailEdits[detail.id];
          if (!edit) continue;
          const priceNum = Number(edit.unit_price);
          const patch: Partial<OrderDetail> = {};
          if (edit.item_name.trim() !== detail.item_name) patch.item_name = edit.item_name.trim();
          if (edit.unit_price.trim() !== '' && priceNum !== Number(detail.unit_price)) patch.unit_price = priceNum;
          if (edit.description !== (detail.description ?? '')) patch.description = edit.description.trim() || null;
          if (orderStatusChoice === 'Completed' && detail.status !== 'Completed') {
            patch.status = 'Completed';
          } else if (edit.status !== detail.status) {
            patch.status = edit.status as OrderDetail['status'];
          }
          const origTailor = detail.assigned_tailor_id ? String(detail.assigned_tailor_id) : '';
          if (edit.assigned_tailor_id !== origTailor) {
            patch.assigned_tailor_id = edit.assigned_tailor_id ? edit.assigned_tailor_id : null;
          }
          if (Object.keys(patch).length > 0) {
            await updateDetail({ id: detail.id, detail: patch, updated_by: updatedBy });
          }
        }

        // Món mới.
        const toAdd: NewOrderDetailItem[] = newItems
          .filter((row) => row.name.trim() !== '' && Number(row.price) >= 0)
          .map((row) => ({
            item_name: row.name.trim(),
            unit_price: Number(row.price),
            description: row.description.trim() || null,
            assigned_tailor_id: row.assigned_tailor_id?.trim() ? row.assigned_tailor_id.trim() : null,
          }));
        if (toAdd.length > 0) {
          await addDetails({ orderId: order.id, items: toAdd, updated_by: updatedBy });
        }

        toast.success('Cập nhật đơn hàng thành công');
        return true;
      } catch (err) {
        toast.error('Lỗi: ' + errorMessage(err));
        return false;
      }
    },
    [updateOrder, updateDetail, addDetails, updatedBy],
  );

  /** Xoá một dòng món; trả về đơn đã bớt dòng đó (để form đang mở cập nhật ngay), hoặc null nếu lỗi. */
  const removeDetail = useCallback(
    async (order: Order, detailId: number): Promise<Order | null> => {
      try {
        await deleteDetail({ id: detailId, updated_by: updatedBy });
        const removed = order.details?.find((x) => x.id === detailId);
        toast.success('Đã xóa dòng sản phẩm');
        return {
          ...order,
          details: (order.details ?? []).filter((x) => x.id !== detailId),
          total_amount: Math.max(0, order.total_amount - (removed ? Number(removed.unit_price) || 0 : 0)),
        };
      } catch (err) {
        toast.error('Lỗi: ' + errorMessage(err));
        return null;
      }
    },
    [deleteDetail, updatedBy],
  );

  return {
    submitEdit,
    removeDetail,
    isSaving: isUpdatingOrder || isUpdatingDetail || isAddingDetails,
    isDeletingDetail,
  };
}
