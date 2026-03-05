import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Role } from '@/lib/types';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<(User & { role: Role | null })[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('*, role:roles(*)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employee, password }: { employee: Partial<User>; password: string }) => {
      if (!employee.email) throw new Error('Email là bắt buộc');

      // 1. Create Supabase Auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: employee.email,
        password,
        options: {
          data: { display_name: employee.name },
        },
      });
      if (authError) throw authError;

      // 2. Insert employee record into users table
      const { data, error } = await supabase
        .from('users')
        .insert(employee)
        .select()
        .single();
      if (error) throw error;

      return data as User;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employee }: { id: number; employee: Partial<User> }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ ...employee, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as User;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useResetEmployeePassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
    },
  });
}
