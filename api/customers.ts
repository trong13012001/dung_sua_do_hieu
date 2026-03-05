import { supabase } from '@/lib/supabase';
import { Customer } from '@/lib/types';

export async function getCustomers({ page = 0, pageSize = 10, searchTerm = '' } = {}) {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' });

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
  }

  const { data, error, count } = await query
    .order('name')
    .range(from, to);

  if (error) throw error;
  return { data: data as Customer[], count };
}

export async function createCustomer(customer: Partial<Customer>) {
  const { data, error } = await supabase.from('customers').insert(customer).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: number | string, customer: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: number | string) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function getCustomer(id: number | string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Customer;
}
