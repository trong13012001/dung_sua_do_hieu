import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Order, OrderDetail } from '@/lib/types';
import { insertOrderLog } from '@/api/orderLogs';

const PAGE_SIZE = 25;

async function enrichOrders(orders: any[]): Promise<Order[]> {
  if (!orders || orders.length === 0) return [];
  const orderIds = orders.map(o => o.id);
  const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))] as number[];
  const [customersRes, detailsRes] = await Promise.all([
    customerIds.length > 0 ? supabase.from('customers').select('id, name, phone').in('id', customerIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('order_details').select('id, order_id, item_name, unit_price, description, status, assigned_tailor_id').in('order_id', orderIds),
  ]);
  const customerMap: Record<number, { id: number; name: string; phone: string | null }> = {};
  if (customersRes.data) for (const c of customersRes.data) customerMap[c.id] = c;
  const detailsByOrder: Record<number, any[]> = {};
  const tailorIds = new Set<number>();
  if (detailsRes.data) {
    for (const d of detailsRes.data) {
      if (!detailsByOrder[d.order_id]) detailsByOrder[d.order_id] = [];
      detailsByOrder[d.order_id].push(d);
      if (d.assigned_tailor_id) tailorIds.add(d.assigned_tailor_id);
    }
  }
  let tailorMap: Record<number, { id: number; name: string }> = {};
  if (tailorIds.size > 0) {
    const { data: tailors } = await supabase.from('users').select('id, name').in('id', [...tailorIds]);
    if (tailors) for (const t of tailors) tailorMap[t.id] = t;
  }
  return orders.map(o => ({
    ...o,
    customer: customerMap[o.customer_id] || null,
    details: (detailsByOrder[o.id] || []).map((d: any) => ({ ...d, tailor: d.assigned_tailor_id ? tailorMap[d.assigned_tailor_id] || null : null })),
  })) as Order[];
}

export type OrdersFilters = { start_date?: string; end_date?: string; status?: string };

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async (): Promise<Order[]> => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, customer_id, total_amount, paid_amount, status, receive_time, return_time, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return enrichOrders(orders || []);
    },
  });
}

export function useOrdersInfinite(filters: OrdersFilters) {
  return useInfiniteQuery({
    queryKey: ['orders-infinite', filters.start_date, filters.end_date, filters.status],
    initialPageParam: 0,
    getNextPageParam: (lastPage: Order[], _allPages) =>
      lastPage.length === PAGE_SIZE ? _allPages.length * PAGE_SIZE : undefined,
    queryFn: async ({ pageParam }): Promise<Order[]> => {
      let q = supabase
        .from('orders')
        .select('id, customer_id, total_amount, paid_amount, status, receive_time, return_time, created_at, updated_at')
        .order('created_at', { ascending: false })
        .range(pageParam as number, (pageParam as number) + PAGE_SIZE - 1);
      if (filters.start_date) q = q.gte('created_at', filters.start_date + 'T00:00:00.000Z');
      if (filters.end_date) q = q.lte('created_at', filters.end_date + 'T23:59:59.999Z');
      if (filters.status) q = q.eq('status', filters.status);
      const { data: orders, error } = await q;
      if (error) throw error;
      return enrichOrders(orders || []);
    },
  });
}

export async function fetchOrdersForExport(filters: OrdersFilters): Promise<Order[]> {
  let q = supabase
    .from('orders')
    .select('id, customer_id, total_amount, paid_amount, status, receive_time, return_time, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (filters.start_date) q = q.gte('created_at', filters.start_date + 'T00:00:00.000Z');
  if (filters.end_date) q = q.lte('created_at', filters.end_date + 'T23:59:59.999Z');
  if (filters.status) q = q.eq('status', filters.status);
  const { data: orders, error } = await q;
  if (error) throw error;
  return enrichOrders(orders || []);
}

export function useOrderItems(tailorId?: number | null) {
  return useQuery({
    queryKey: ['order-items', tailorId],
    enabled: !!tailorId,
    queryFn: async () => {
      // Step 1: fetch details for this tailor
      const { data: details, error } = await supabase
        .from('order_details')
        .select('id, order_id, item_name, description, unit_price, status, assigned_tailor_id')
        .eq('assigned_tailor_id', tailorId!)
        .in('status', ['New', 'In Progress', 'Ready', 'Completed'])
        .limit(100);
      if (error) throw error;
      if (!details || details.length === 0) return [];

      // Step 2: fetch parent orders + customers
      const orderIds = [...new Set(details.map(d => d.order_id))];
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, customer_id')
        .in('id', orderIds);
      const customerIds = [...new Set((orders || []).map(o => o.customer_id).filter(Boolean))] as number[];
      const { data: customers } = customerIds.length > 0
        ? await supabase.from('customers').select('id, name').in('id', customerIds)
        : { data: [] };

      const customerMap: Record<number, string> = {};
      if (customers) for (const c of customers) customerMap[c.id] = c.name;
      const orderMap: Record<number, any> = {};
      if (orders) for (const o of orders) orderMap[o.id] = { ...o, customerName: customerMap[o.customer_id] || 'Vãng lai' };

      return details.map((d: any) => ({
        ...d,
        orderNumber: d.order_id,
        customerName: orderMap[d.order_id]?.customerName || 'Vãng lai',
        orderCreatedAt: orderMap[d.order_id]?.created_at || '',
      }));
    },
  });
}

export function useAllOrderItems() {
  return useQuery({
    queryKey: ['all-order-items'],
    queryFn: async () => {
      const { data: details, error } = await supabase
        .from('order_details')
        .select('id, order_id, item_name, description, unit_price, status, assigned_tailor_id')
        .in('status', ['New', 'In Progress', 'Ready', 'Completed'])
        .limit(500);
      if (error) throw error;
      if (!details || details.length === 0) return [];

      // Step 2: fetch related orders + customers + tailors in parallel
      const orderIds = [...new Set(details.map(d => d.order_id))];
      const tailorIds = [...new Set(details.map(d => d.assigned_tailor_id).filter(Boolean))] as number[];

      const [ordersRes, tailorsRes] = await Promise.all([
        supabase.from('orders').select('id, status, created_at, customer_id').in('id', orderIds),
        tailorIds.length > 0
          ? supabase.from('users').select('id, name').in('id', tailorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const customerIds = [...new Set((ordersRes.data || []).map(o => o.customer_id).filter(Boolean))] as number[];
      const { data: customers } = customerIds.length > 0
        ? await supabase.from('customers').select('id, name').in('id', customerIds)
        : { data: [] };

      const customerMap: Record<number, string> = {};
      if (customers) for (const c of customers) customerMap[c.id] = c.name;
      const orderMap: Record<number, any> = {};
      if (ordersRes.data) for (const o of ordersRes.data) orderMap[o.id] = { ...o, customerName: customerMap[o.customer_id] || 'Vãng lai' };
      const tailorMap: Record<number, { id: number; name: string }> = {};
      if (tailorsRes.data) for (const t of tailorsRes.data) tailorMap[t.id] = t;

      return details.map((d: any) => ({
        ...d,
        tailor: d.assigned_tailor_id ? tailorMap[d.assigned_tailor_id] || null : null,
        orderNumber: d.order_id,
        customerName: orderMap[d.order_id]?.customerName || 'Vãng lai',
        orderCreatedAt: orderMap[d.order_id]?.created_at || '',
        orderStatus: orderMap[d.order_id]?.status || '',
      }));
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, items, updated_by }: {
      order: Partial<Order>;
      items: { name: string; price: number; description: string; assigned_tailor_id?: string | null }[];
      updated_by?: number | null;
    }) => {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      if (orderError) throw orderError;

      if (items.length > 0) {
        const details = items.map(item => ({
          order_id: orderData.id,
          item_name: item.name,
          description: item.description,
          unit_price: item.price,
          status: 'New',
          assigned_tailor_id: item.assigned_tailor_id || null,
        }));
        const { error: detailsError } = await supabase.from('order_details').insert(details);
        if (detailsError) throw detailsError;
      }
      const customerId = orderData.customer_id != null ? Number(orderData.customer_id) : null;
      if (customerId != null) {
        const { error: debtError } = await supabase.rpc('recalculate_customer_debt', { customer_id: customerId });
        if (debtError) throw debtError;
      }
      await insertOrderLog({ order_id: orderData.id, action: 'order_created', new_value: orderData as unknown as Record<string, unknown>, updated_by });
      return orderData as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders-infinite'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, order, updated_by }: { id: number; order: Partial<Order>; updated_by?: number | null }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ ...order, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await insertOrderLog({ order_id: id, action: 'order_updated', new_value: order as Record<string, unknown>, updated_by });
      return data as Order;
    },
    onMutate: async ({ id, order }) => {
      await qc.cancelQueries({ queryKey: ['orders'] });
      await qc.cancelQueries({ queryKey: ['orders-infinite'] });
      const prev = qc.getQueryData<Order[]>(['orders']);
      if (prev) {
        qc.setQueryData<Order[]>(['orders'], prev.map(o =>
          o.id === id ? { ...o, ...order } : o
        ));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['orders'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders-infinite'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data as Order;
    },
    onMutate: async ({ orderId, status }) => {
      await qc.cancelQueries({ queryKey: ['orders'] });
      await qc.cancelQueries({ queryKey: ['orders-infinite'] });
      const prev = qc.getQueryData<Order[]>(['orders']);
      if (prev) {
        qc.setQueryData<Order[]>(['orders'], prev.map(o =>
          o.id === orderId ? { ...o, status: status as Order['status'] } : o
        ));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['orders'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders-infinite'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateOrderDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, detail, updated_by }: { id: number; detail: Partial<OrderDetail>; updated_by?: number | null }) => {
      const payload: Record<string, unknown> = { ...detail, updated_at: new Date().toISOString() };
      if ('assigned_tailor_id' in detail) {
        const v = detail.assigned_tailor_id;
        payload.assigned_tailor_id = v == null || v === '' ? null : Number(v);
      }
      const { data, error } = await supabase
        .from('order_details')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await insertOrderLog({
        order_id: data.order_id,
        action: 'detail_updated',
        entity_type: 'order_detail',
        entity_id: id,
        new_value: detail as Record<string, unknown>,
        updated_by,
      });

      // Auto-sync parent order status based on all sibling item statuses
      if (detail.status) {
        const { data: siblings } = await supabase
          .from('order_details')
          .select('status')
          .eq('order_id', data.order_id);
        if (siblings && siblings.length > 0) {
          const allReady = siblings.every(s => s.status === 'Ready' || s.status === 'Completed');
          const anyInProgress = siblings.some(s => s.status === 'In Progress');
          let newOrderStatus: string | null = null;
          if (allReady) {
            newOrderStatus = 'Ready';
          } else if (anyInProgress || detail.status === 'In Progress') {
            newOrderStatus = 'In Progress';
          }
          if (newOrderStatus) {
            await supabase
              .from('orders')
              .update({ status: newOrderStatus, updated_at: new Date().toISOString() })
              .eq('id', data.order_id);
          }
        }
      }

      return data as OrderDetail;
    },
    onMutate: async ({ id, detail }) => {
      await qc.cancelQueries({ queryKey: ['orders'] });
      await qc.cancelQueries({ queryKey: ['orders-infinite'] });
      await qc.cancelQueries({ queryKey: ['all-order-items'] });
      await qc.cancelQueries({ queryKey: ['order-items'] });
      const prev = qc.getQueryData<Order[]>(['orders']);
      if (prev) {
        qc.setQueryData<Order[]>(['orders'], prev.map(o => ({
          ...o,
          details: o.details?.map(d =>
            d.id === id ? { ...d, ...detail } : d
          ),
        })));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['orders'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders-infinite'] });
      qc.invalidateQueries({ queryKey: ['all-order-items'] });
      qc.invalidateQueries({ queryKey: ['order-items'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export type NewOrderDetailItem = {
  item_name: string;
  unit_price: number;
  description?: string | null;
  assigned_tailor_id?: number | string | null;
};

export function useAddOrderDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      items,
      updated_by,
    }: {
      orderId: number;
      items: NewOrderDetailItem[];
      updated_by?: number | null;
    }) => {
      if (items.length === 0) return [];
      const rows = items.map((item) => ({
        order_id: orderId,
        item_name: item.item_name,
        description: item.description ?? null,
        unit_price: Number(item.unit_price),
        status: 'New',
        assigned_tailor_id: item.assigned_tailor_id ? Number(item.assigned_tailor_id) : null,
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from('order_details')
        .insert(rows)
        .select();
      if (insertErr) throw insertErr;
      const addTotal = rows.reduce((s, r) => s + Number(r.unit_price), 0);
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('total_amount, customer_id')
        .eq('id', orderId)
        .single();
      if (orderErr) throw orderErr;
      const newTotal = (Number(order?.total_amount) || 0) + addTotal;
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (updateErr) throw updateErr;
      const customerId = order?.customer_id == null ? null : Number(order.customer_id);
      if (customerId !== null) {
        const { error: debtErr } = await supabase.rpc('recalculate_customer_debt', { customer_id: customerId });
        if (debtErr) throw debtErr;
      }
      for (const d of inserted || []) {
        await insertOrderLog({
          order_id: orderId,
          action: 'detail_updated',
          entity_type: 'order_detail',
          entity_id: d.id,
          new_value: { item_name: d.item_name, unit_price: d.unit_price } as Record<string, unknown>,
          updated_by,
        });
      }
      return inserted as OrderDetail[];
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', variables.orderId] });
      qc.invalidateQueries({ queryKey: ['orders-infinite'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['all-order-items'] });
      qc.invalidateQueries({ queryKey: ['order-items'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg: number | { id: number; updated_by?: number | null }) => {
      const id = typeof arg === 'number' ? arg : arg.id;
      const updated_by = typeof arg === 'number' ? null : arg.updated_by;
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      await insertOrderLog({ order_id: id, action: 'order_deleted', updated_by });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders-infinite'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export async function getCustomerOrders(customerId: number | string): Promise<Order[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map(o => o.id);
  const [detailsRes, paymentsRes] = await Promise.all([
    supabase.from('order_details').select('*').in('order_id', orderIds),
    supabase.from('payments').select('*').in('order_id', orderIds),
  ]);

  const detailsByOrder: Record<number, any[]> = {};
  if (detailsRes.data) for (const d of detailsRes.data) {
    if (!detailsByOrder[d.order_id]) detailsByOrder[d.order_id] = [];
    detailsByOrder[d.order_id].push(d);
  }
  const paymentsByOrder: Record<number, any[]> = {};
  if (paymentsRes.data) for (const p of paymentsRes.data) {
    if (!paymentsByOrder[p.order_id]) paymentsByOrder[p.order_id] = [];
    paymentsByOrder[p.order_id].push(p);
  }

  return orders.map(o => ({
    ...o,
    details: detailsByOrder[o.id] || [],
    payments: paymentsByOrder[o.id] || [],
  })) as Order[];
}

export async function getOrder(orderId: number | string): Promise<Order> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (error) throw error;

  const [customerRes, detailsRes, paymentsRes] = await Promise.all([
    order.customer_id
      ? supabase.from('customers').select('*').eq('id', order.customer_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('order_details').select('*').eq('order_id', order.id),
    supabase.from('payments').select('*').eq('order_id', order.id),
  ]);

  const details = detailsRes.data || [];
  const tailorIds = [...new Set(details.map((d: any) => d.assigned_tailor_id).filter(Boolean))];
  let tailorMap: Record<number, { id: number; name: string }> = {};
  if (tailorIds.length > 0) {
    const { data: tailors } = await supabase.from('users').select('id, name').in('id', tailorIds);
    if (tailors) for (const t of tailors) tailorMap[t.id] = t;
  }

  const detailsWithTailor = details.map((d: any) => ({
    ...d,
    tailor: d.assigned_tailor_id ? tailorMap[d.assigned_tailor_id] || null : null,
  }));

  return {
    ...order,
    customer: customerRes.data || null,
    details: detailsWithTailor,
    payments: paymentsRes.data || [],
  } as Order;
}
