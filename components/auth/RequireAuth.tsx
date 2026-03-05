'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAllowed(true);
      } else {
        router.replace('/login');
        return;
      }
      setLoading(false);
    });
  }, [router]);

  if (loading || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
