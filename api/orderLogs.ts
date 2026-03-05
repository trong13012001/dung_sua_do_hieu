import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { OrderLog } from '@/lib/types';

export function useOrderLogs(orderId: number | null) {
  return useQuery({
    queryKey: ['order-logs', orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<(OrderLog & { user?: { id: string; name: string } })[]> => {
      const { data, error } = await supabase
        .from('order_logs')
        .select('*')
        .eq('order_id', orderId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set((data as any[]).map((l: any) => l.updated_by).filter(Boolean))];
      const { data: users } = userIds.length > 0
        ? await supabase.from('users').select('id, name').in('id', userIds)
        : { data: [] };
      const userMap: Record<string, { id: string; name: string }> = {};
      if (users) for (const u of users) userMap[String(u.id)] = { id: String(u.id), name: u.name };

      return (data as any[]).map((l: any) => ({ ...l, user: l.updated_by ? userMap[String(l.updated_by)] ?? null : null }));
    },
  });
}

export async function insertOrderLog(params: {
  order_id: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  updated_by?: string | null;
}) {
  const { error } = await supabase.from('order_logs').insert({
    order_id: params.order_id,
    action: params.action,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    old_value: params.old_value ?? null,
    new_value: params.new_value ?? null,
    updated_by: params.updated_by ?? null,
  });
  if (error) throw error;
}
