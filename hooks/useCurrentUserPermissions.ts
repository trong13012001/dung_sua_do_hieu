'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useEmployees } from '@/api/users';
import { usePermissionsForRole } from '@/api/permissions';
import { User, Role } from '@/lib/types';

export type CurrentUser = (User & { role: Role | null }) | null;

export function useCurrentUserPermissions() {
  const { data: employees } = useEmployees();
  const [roleId, setRoleId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const { data: permissionNames = [], isLoading } = usePermissionsForRole(roleId);

  useEffect(() => {
    let mounted = true;
    async function resolve() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !employees) {
        if (mounted) {
          setRoleId(null);
          setCurrentUser(null);
        }
        return;
      }
      const match = employees.find((e: User & { role: Role | null }) => e.email === user.email) ?? null;
      if (mounted) {
        setRoleId(match?.role_id ?? null);
        setCurrentUser(match ?? null);
      }
    }
    resolve();
    return () => { mounted = false; };
  }, [employees]);

  const has = (name: string) => permissionNames.includes(name);

  return { permissions: permissionNames, has, isLoading, currentUser };
}
