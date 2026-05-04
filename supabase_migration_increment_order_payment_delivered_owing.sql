-- Bản vá RPC: khi thu đủ, đơn đang Trả thiếu tiền (DeliveredOwing) → Đã trả đồ (Delivered).
-- Chạy sau `supabase_migration_order_status_paid.sql` nếu DB đã tạo hàm cũ thiếu nhánh DeliveredOwing.

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
