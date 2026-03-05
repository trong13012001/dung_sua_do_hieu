export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  total_debt: number;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  created_at: string;
}

export interface Permission {
  id: number;
  name: string;
  created_at: string;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

export interface User {
  id: number;
  name: string;
  email?: string | null;
  phone: string | null;
  id_card?: string | null;
  address?: string | null;
  role_id: number | null;
  created_at: string;
  updated_at: string;
  role?: Role;
}

export interface OrderDetail {
  id: number;
  order_id: number;
  item_name: string;
  description: string | null;
  unit_price: number;
  status: 'New' | 'In Progress' | 'Ready' | 'Completed';
  assigned_tailor_id: string | null;
  created_at: string;
  updated_at: string;

  tailor?: Partial<User> | null;
  order?: Partial<Order> | null;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  payment_time: string;
  payment_method: 'Cash' | 'Card' | 'Transfer';
}

export interface Order {
  id: number;
  customer_id: number;
  total_amount: number;
  paid_amount: number;
  status: 'New' | 'In Progress' | 'Ready' | 'Delivered' | 'Completed';
  receive_time: string;
  return_time: string | null;
  created_at: string;
  updated_at: string;

  customer?: Partial<Customer>;
  details?: OrderDetail[];
  payments?: Payment[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface OrderLog {
  id: number;
  order_id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  updated_by: number | null;
  created_at: string;
  user?: Partial<User>;
}
