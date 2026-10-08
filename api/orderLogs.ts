import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { OrderLog } from '@/lib/types';

export function useOrderLogs(orderId: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['order-logs', orderId],
    enabled: !!orderId && (options?.enabled ?? true),
    queryFn: async (): Promise<(OrderLog & { user?: { id: string; name: string } | null })[]> => {
      // Tên người sửa lấy qua embed (order_logs.updated_by → users) — một request thay vì hai.
      const { data, error } = await supabase
        .from('order_logs')
        .select('*, user:users(id, name)')
        .eq('order_id', orderId!)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data || []) as any[]).map((l: any) => ({
        ...l,
        user: l.user ? { id: String(l.user.id), name: l.user.name } : null,
      }));
    },
  });
}

type OrderLogInput = {
  order_id: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  updated_by?: string | null;
};

export async function insertOrderLog(params: OrderLogInput) {
  return insertOrderLogs([params]);
}

/** Ghi nhiều dòng log trong một request (vd. thêm nhiều món một lúc). */
export async function insertOrderLogs(entries: OrderLogInput[]) {
  const rows = entries
    .map((p) => ({ ...p, order_id: Number(p.order_id) }))
    .filter((p) => Number.isFinite(p.order_id) && p.order_id > 0)
    .map((p) => ({
      order_id: p.order_id,
      action: p.action,
      entity_type: p.entity_type ?? null,
      entity_id: p.entity_id ?? null,
      old_value: p.old_value ?? null,
      new_value: p.new_value ?? null,
      updated_by: p.updated_by ?? null,
    }));
  if (rows.length === 0) return;

  const { error } = await supabase.from('order_logs').insert(rows);
  if (error) {
    // Never block business flow (create/update/payment) because of audit-log FK drift.
    // (Đơn đã bị xoá → lỗi khoá ngoại; trước đây kiểm tra tồn tại bằng một query riêng mỗi lần ghi.)
    if (error.code === '23503' && error.message.includes('order_logs_order_id_fkey')) return;
    throw error;
  }
}
