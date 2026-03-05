import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Payment } from '@/lib/types';
import { insertOrderLog } from '@/api/orderLogs';

export function usePayments(orderId?: number) {
  return useQuery({
    queryKey: ['payments', orderId],
    queryFn: async (): Promise<(Payment & { order: { customer: Customer } })[]> => {
      let query = supabase.from('payments').select('*, order:orders(customer:customers(*))');
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      const { data, error } = await query.order('payment_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Payment> & { updated_by?: number | null }) => {
      const { updated_by, ...payment } = payload;
      const { data, error } = await supabase.from('payments').insert(payment).select().single();
      if (error) throw error;

      const orderId = Number(payment.order_id);
      const amount = Number(payment.amount);
      if (Number.isNaN(orderId) || Number.isNaN(amount) || amount <= 0) {
        throw new Error('order_id và amount không hợp lệ');
      }
      const { error: orderError } = await supabase.rpc('increment_order_payment', {
        order_id: orderId,
        amount,
      });
      if (orderError) throw new Error(orderError.message || 'Cập nhật paid_amount thất bại');

      await insertOrderLog({
        order_id: payment.order_id!,
        action: 'payment',
        entity_type: 'payment',
        entity_id: data.id,
        new_value: { amount: payment.amount, payment_method: payment.payment_method } as Record<string, unknown>,
        updated_by,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      const orderId = variables.order_id;
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (orderId != null) {
        queryClient.invalidateQueries({ queryKey: ['payments', orderId] });
        queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        queryClient.refetchQueries({ queryKey: ['orders', orderId] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['stats', 'monthly'] });
    },
  });
}
