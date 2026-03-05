import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Role, Permission, RolePermission } from '@/lib/types';

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('roles').insert({ name }).select().single();
      if (error) throw error;
      return data as Role;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { data, error } = await supabase.from('roles').update({ name }).eq('id', id).select().single();
      if (error) throw error;
      return data as Role;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useRolePermissions(roleId: number | null) {
  return useQuery({
    queryKey: ['role_permissions', roleId],
    queryFn: async (): Promise<RolePermission[]> => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId!);
      if (error) throw error;
      return data;
    },
    enabled: !!roleId,
  });
}

export function useSetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) => {
      const { error: delErr } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
      if (delErr) throw delErr;

      if (permissionIds.length > 0) {
        const rows = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error: insErr } = await supabase.from('role_permissions').insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['role_permissions', vars.roleId] });
    },
  });
}
