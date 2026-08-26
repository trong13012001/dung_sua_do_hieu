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
    status TEXT DEFAULT 'New', -- New, In Progress, Ready, Paid, Delivered, DeliveredOwing, Completed
    receive_time TIMESTAMPTZ DEFAULT NOW(),
    return_time TIMESTAMPTZ,
    transaction_code TEXT, -- mã 11 số WPF; sinh bởi trigger (xem supabase_migration_order_transaction_code.sql)
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
    handed_over_at TIMESTAMPTZ,
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
    st TEXT;
BEGIN
    UPDATE orders
    SET paid_amount = COALESCE(paid_amount, 0) + amount,
        updated_at = NOW()
    WHERE id = order_id;

    SELECT paid_amount, total_amount, status INTO new_paid, total, st FROM orders WHERE id = order_id;

    IF new_paid >= total THEN
        UPDATE orders
        SET status = CASE
            WHEN st = 'DeliveredOwing' THEN 'Delivered'
            WHEN st IN ('Ready', 'Delivered') THEN st
            ELSE 'Paid'
        END,
        updated_at = NOW()
        WHERE id = order_id;
    END IF;

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

-- ============================================================
-- Tổng hợp số liệu dashboard (xem supabase_migration_dashboard_aggregates.sql)
-- Cộng tổng phải làm ở đây: PostgREST chỉ trả 1000 dòng nên cộng ở client ra sai số.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
    total_revenue numeric,
    customer_count bigint,
    pending_count bigint,
    total_debt numeric,
    order_count bigint,
    completed_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM payments),
        (SELECT COUNT(*) FROM customers),
        (SELECT COUNT(*) FROM orders WHERE status IN ('New', 'In Progress')),
        (SELECT COALESCE(SUM(total_debt), 0) FROM customers),
        (SELECT COUNT(*) FROM orders),
        (SELECT COUNT(*) FROM orders WHERE status IN ('Ready', 'Completed'));
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_revenue()
RETURNS TABLE (
    month_key text,
    revenue numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        to_char(payment_time AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month_key,
        COALESCE(SUM(amount), 0) AS revenue
    FROM payments
    GROUP BY 1
    ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_revenue() TO anon, authenticated;

-- Existing DB: add new permissions (skip if already present): view_orders, view_tasks, update_tasks, view_customers, manage_customers, manage_roles, manage_permissions, view_returns. Then assign to admin via role_permissions.
