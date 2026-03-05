'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeSubscription() {
  const qc = useQueryClient();

  const qcRef = useRef(qc);
  qcRef.current = qc;

  // Refetch when user returns to this tab (fallback when Realtime doesn't push)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const q = qcRef.current;
      q.invalidateQueries({ queryKey: ['orders'] });
      q.invalidateQueries({ queryKey: ['orders-infinite'] });
      q.invalidateQueries({ queryKey: ['stats'] });
      q.invalidateQueries({ queryKey: ['stats', 'monthly'] });
      q.invalidateQueries({ queryKey: ['order-items'] });
      q.invalidateQueries({ queryKey: ['all-order-items'] });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('global-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          qc.invalidateQueries({ queryKey: ['orders'] });
          qc.invalidateQueries({ queryKey: ['orders-infinite'] });
          qc.invalidateQueries({ queryKey: ['stats'] });
          qc.invalidateQueries({ queryKey: ['stats', 'monthly'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_details' },
        () => {
          qc.invalidateQueries({ queryKey: ['orders'] });
          qc.invalidateQueries({ queryKey: ['orders-infinite'] });
          qc.invalidateQueries({ queryKey: ['all-order-items'] });
          qc.invalidateQueries({ queryKey: ['order-items'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          qc.invalidateQueries({ queryKey: ['orders'] });
          qc.invalidateQueries({ queryKey: ['orders-infinite'] });
          qc.invalidateQueries({ queryKey: ['stats'] });
          qc.invalidateQueries({ queryKey: ['stats', 'monthly'] });
          qc.invalidateQueries({ queryKey: ['customers'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Subscription issue:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
