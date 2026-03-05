'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { notifyOrderStatusUpdate } from '@/lib/orderNotification';

const POLL_INTERVAL_MS = 25000;
const RECONNECT_DELAY_MS = 3000;

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['orders'] });
  qc.invalidateQueries({ queryKey: ['orders-infinite'] });
  qc.invalidateQueries({ queryKey: ['stats'] });
  qc.invalidateQueries({ queryKey: ['stats', 'monthly'] });
  qc.invalidateQueries({ queryKey: ['order-items'] });
  qc.invalidateQueries({ queryKey: ['all-order-items'] });
  qc.invalidateQueries({ queryKey: ['customers'] });
}

export function useRealtimeSubscription() {
  const qc = useQueryClient();
  const qcRef = useRef(qc);
  qcRef.current = qc;
  const [reconnectKey, setReconnectKey] = useState(0);

  // Refetch when user returns to this tab
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      invalidateAll(qcRef.current);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Polling fallback: refetch every N seconds when tab is visible (phone gets updates even if Realtime drops)
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        invalidateAll(qcRef.current);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Realtime channel; re-run effect on reconnectKey to recreate channel after error
  useEffect(() => {
    const channel = supabase
      .channel('global-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          const q = qcRef.current;
          q.invalidateQueries({ queryKey: ['orders'] });
          q.invalidateQueries({ queryKey: ['orders-infinite'] });
          q.invalidateQueries({ queryKey: ['stats'] });
          q.invalidateQueries({ queryKey: ['stats', 'monthly'] });
          notifyOrderStatusUpdate(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_details' },
        () => {
          const q = qcRef.current;
          q.invalidateQueries({ queryKey: ['orders'] });
          q.invalidateQueries({ queryKey: ['orders-infinite'] });
          q.invalidateQueries({ queryKey: ['all-order-items'] });
          q.invalidateQueries({ queryKey: ['order-items'] });
          notifyOrderStatusUpdate(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          const q = qcRef.current;
          q.invalidateQueries({ queryKey: ['orders'] });
          q.invalidateQueries({ queryKey: ['orders-infinite'] });
          q.invalidateQueries({ queryKey: ['stats'] });
          q.invalidateQueries({ queryKey: ['stats', 'monthly'] });
          q.invalidateQueries({ queryKey: ['customers'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Reconnecting after:', status);
          supabase.removeChannel(channel);
          setTimeout(() => setReconnectKey((k) => k + 1), RECONNECT_DELAY_MS);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reconnectKey]);
}
