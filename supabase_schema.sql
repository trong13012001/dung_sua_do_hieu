-- Dũng sửa đồ hiệu CRM - Supabase (PostgreSQL) Schema

-- 1. Roles and Permissions
CREATE TABLE roles (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 2. Users (Employees)
CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    phone TEXT,
    id_card TEXT,
    address TEXT,
    role_id BIGINT REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRM (Customers)
CREATE TABLE customers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    total_debt DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE orders (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id BIGINT REFERENCES customers(id),
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'New', -- New, In Progress, Ready, Completed, Delivered
    receive_time TIMESTAMPTZ DEFAULT NOW(),
    return_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order Details (tailor assigned per item)
CREATE TABLE order_details (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    description TEXT,
    unit_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'New',
    assigned_tailor_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payments
CREATE TABLE payments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_time TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT -- 'Cash', 'Card', 'Transfer'
);

-- 6b. Order Log (who updated what)
CREATE TABLE order_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'order_created', 'order_updated', 'order_status', 'payment', 'detail_updated', 'order_deleted'
    entity_type TEXT, -- 'order', 'order_detail', 'payment'
    entity_id BIGINT,
    old_value JSONB,
    new_value JSONB,
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Data
INSERT INTO roles (name) VALUES ('admin'), ('tailor'), ('reception'), ('account');
INSERT INTO permissions (name) VALUES
  ('view_dashboard'),
  ('manage_users'),
  ('create_order'),
  ('process_payment'),
  ('update_order_status'),
  ('view_orders'),
  ('view_tasks'),
  ('update_tasks'),
  ('view_customers'),
  ('manage_customers'),
  ('manage_roles'),
  ('manage_permissions'),
  ('view_returns');

-- Assign all permissions to Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- 7. RPC Functions
CREATE OR REPLACE FUNCTION increment_order_payment(order_id BIGINT, amount DECIMAL)
RETURNS VOID AS $$
DECLARE
    new_paid DECIMAL(10,2);
    total DECIMAL(10,2);
BEGIN
    -- Update paid_amount in orders (COALESCE so NULL + amount works)
    UPDATE orders 
    SET paid_amount = COALESCE(paid_amount, 0) + amount,
        updated_at = NOW()
    WHERE id = order_id;

    -- If fully paid, set status to Completed
    SELECT paid_amount, total_amount INTO new_paid, total FROM orders WHERE id = order_id;
    IF new_paid >= total THEN
        UPDATE orders SET status = 'Completed', updated_at = NOW() WHERE id = order_id;
    END IF;

    -- Update total_debt in customers (minus when pay: debt = sum of unpaid per order)
    UPDATE customers
    SET total_debt = (
        SELECT COALESCE(SUM(o.total_amount - COALESCE(o.paid_amount, 0)), 0)
        FROM orders o
        WHERE o.customer_id = customers.id
    ),
    updated_at = NOW()
    WHERE id = (SELECT customer_id FROM orders WHERE id = order_id);
END;
$$ LANGUAGE plpgsql;

-- When create order: recalc customer total_debt (plus new order's debt)
CREATE OR REPLACE FUNCTION recalculate_customer_debt(customer_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE customers
    SET total_debt = (
        SELECT COALESCE(SUM(o.total_amount - COALESCE(o.paid_amount, 0)), 0)
        FROM orders o
        WHERE o.customer_id = recalculate_customer_debt.customer_id
    ),
    updated_at = NOW()
    WHERE id = recalculate_customer_debt.customer_id;
END;
$$ LANGUAGE plpgsql;

-- Existing DB: add new permissions (skip if already present): view_orders, view_tasks, update_tasks, view_customers, manage_customers, manage_roles, manage_permissions, view_returns. Then assign to admin via role_permissions.
