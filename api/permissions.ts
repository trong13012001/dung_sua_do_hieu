import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Permission } from '@/lib/types';

export function usePermissionsForRole(roleId: number | null) {
  return useQuery({
    queryKey: ['permissions-for-role', roleId],
    queryFn: async (): Promise<string[]> => {
      if (roleId == null) return [];
      // Tên quyền lấy qua embed (role_permissions → permissions) — một request thay vì hai.
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission:permissions(name)')
        .eq('role_id', roleId)
        .overrideTypes<{ permission: { name: string } | null }[], { merge: false }>();
      if (error) throw error;
      return (data || []).flatMap((r) => (r.permission ? [r.permission.name] : []));
    },
    enabled: roleId != null,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('permissions').insert({ name }).select().single();
      if (error) throw error;
      return data as Permission;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { data, error } = await supabase.from('permissions').update({ name }).eq('id', id).select().single();
      if (error) throw error;
      return data as Permission;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
}

export function useDeletePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('permissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
}
