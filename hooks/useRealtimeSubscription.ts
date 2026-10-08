'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { notifyOrderStatusUpdate } from '@/lib/orderNotification';

/** Gom các event realtime trong khoảng này rồi invalidate một lần (tạo một đơn sinh hàng chục event). */
const EVENT_DEBOUNCE_MS = 600;
/** Poll dự phòng khi kênh realtime chưa/không kết nối. */
const POLL_DISCONNECTED_MS = 25_000;
/** Poll an toàn khi kênh báo đã kết nối — điện thoại đôi khi rớt realtime mà không báo lỗi. */
const POLL_CONNECTED_MS = 120_000;
/** Không làm mới lại khi quay về tab trong khoảng này kể từ lần làm mới trước. */
const VISIBILITY_MIN_GAP_MS = 10_000;
const RECONNECT_DELAY_MS = 3000;

type Table = 'orders' | 'order_details' | 'payments';

/** Họ query key bị ảnh hưởng khi một bảng thay đổi (khớp theo tiền tố). */
const KEYS_BY_TABLE: Record<Table, string[]> = {
  // Tạo/sửa đơn đổi công nợ khách (trigger) → làm mới cả danh sách khách.
  orders: ['orders', 'orders-infinite', 'orders-page', 'returns-orders', 'returns-counts', 'customers', 'stats'],
  order_details: ['orders', 'orders-infinite', 'orders-page', 'returns-orders', 'all-order-items', 'order-items', 'stats'],
  payments: ['orders', 'orders-infinite', 'orders-page', 'returns-orders', 'payments', 'customers', 'stats'],
};

/** Poll chỉ làm mới dữ liệu đơn/việc — không chạy lại analytics dashboard (nặng) mỗi chu kỳ. */
const POLL_KEYS = ['orders', 'orders-infinite', 'orders-page', 'returns-orders', 'returns-counts', 'all-order-items', 'order-items'];

const ALL_KEYS = [...new Set([...Object.values(KEYS_BY_TABLE).flat(), ...POLL_KEYS])];

function invalidateKeys(qc: QueryClient, keys: Iterable<string>) {
  for (const key of keys) qc.invalidateQueries({ queryKey: [key] });
}

export function useRealtimeSubscription() {
  const qc = useQueryClient();
  const qcRef = useRef(qc);
  qcRef.current = qc;
  const [reconnectKey, setReconnectKey] = useState(0);
  const subscribedRef = useRef(false);
  const lastRefreshRef = useRef(0);

  // Quay lại tab: làm mới mọi thứ (kể cả stats), nhưng không dồn dập khi chuyển tab liên tục.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshRef.current < VISIBILITY_MIN_GAP_MS) return;
      lastRefreshRef.current = now;
      invalidateKeys(qcRef.current, ALL_KEYS);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Poll dự phòng: dày khi realtime mất kết nối, thưa khi đang kết nối.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.visibilityState === 'visible') {
        lastRefreshRef.current = Date.now();
        invalidateKeys(qcRef.current, POLL_KEYS);
      }
      timer = setTimeout(tick, subscribedRef.current ? POLL_CONNECTED_MS : POLL_DISCONNECTED_MS);
    };
    timer = setTimeout(tick, POLL_DISCONNECTED_MS);
    return () => clearTimeout(timer);
  }, []);

  // Kênh realtime; đổi reconnectKey để tạo lại kênh sau lỗi.
  useEffect(() => {
    const pending = new Set<Table>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      const keys = new Set<string>();
      for (const table of pending) for (const k of KEYS_BY_TABLE[table]) keys.add(k);
      const shouldNotify = pending.has('orders') || pending.has('order_details');
      pending.clear();
      lastRefreshRef.current = Date.now();
      invalidateKeys(qcRef.current, keys);
      if (shouldNotify) notifyOrderStatusUpdate(true);
    };

    const onChange = (table: Table) => () => {
      pending.add(table);
      if (flushTimer == null) flushTimer = setTimeout(flush, EVENT_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange('orders'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_details' }, onChange('order_details'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange('payments'))
      .subscribe((status) => {
        subscribedRef.current = status === 'SUBSCRIBED';
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Reconnecting after:', status);
          supabase.removeChannel(channel);
          setTimeout(() => setReconnectKey((k) => k + 1), RECONNECT_DELAY_MS);
        }
      });

    return () => {
      if (flushTimer != null) clearTimeout(flushTimer);
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [reconnectKey]);
}
