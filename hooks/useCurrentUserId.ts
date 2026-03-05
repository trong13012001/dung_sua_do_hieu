'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useEmployees } from '@/api/users';
import { User, Role } from '@/lib/types';

/** Returns current user's id (UUID string) from employees by auth email. */
export function useCurrentUserId(): string | null {
  const { data: employees } = useEmployees();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function resolve() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && employees) {
        const match = employees.find((e: User & { role: Role | null }) => e.email === user.email);
        setUserId(match?.id != null ? String(match.id) : null);
      } else {
        setUserId(null);
      }
    }
    if (employees) resolve();
  }, [employees]);

  return userId;
}
