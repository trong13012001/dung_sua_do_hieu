-- Dashboard theo kỳ (ngày / tháng / năm): gom các con số tổng vào MỘT lần gọi SQL.
--
-- Trước đây api/stats.ts `fetchPeriodAnalytics` tự tính ở client:
--   * 3 lệnh đếm + 7 lệnh đếm theo trạng thái (10 request),
--   * cộng công nợ bằng cách kéo từng trang 1000 đơn tạo trong kỳ,
--   * kéo hết id đơn đã trả rồi đếm món theo lô 200 — lần lượt từng lô.
-- Chế độ "Năm" vì thế là vài chục request, lặp lại mỗi lần dashboard làm mới.
--
-- Code đã có fallback: nếu hàm này chưa tồn tại, dashboard vẫn tính kiểu cũ.
-- Chạy file này trên Supabase dashboard → SQL Editor. Chạy lại nhiều lần không sao.

CREATE OR REPLACE FUNCTION public.get_period_summary(p_start timestamptz, p_end timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH created AS (
        SELECT id, status, total_amount, paid_amount
        FROM orders
        WHERE created_at >= p_start AND created_at <= p_end
    ),
    returned AS (
        SELECT id
        FROM orders
        WHERE status IN ('Delivered', 'DeliveredOwing')
          AND return_time IS NOT NULL
          AND return_time >= p_start AND return_time <= p_end
    )
    SELECT jsonb_build_object(
        'orders_created_count', (SELECT COUNT(*) FROM created),
        'orders_returned_count', (SELECT COUNT(*) FROM returned),
        'items_created_count', (
            SELECT COUNT(*) FROM order_details
            WHERE created_at >= p_start AND created_at <= p_end
        ),
        'items_returned_count', (
            SELECT COUNT(*) FROM order_details d
            WHERE d.order_id IN (SELECT id FROM returned)
        ),
        'unpaid_on_orders_created', (
            SELECT COALESCE(SUM(GREATEST(total_amount - COALESCE(paid_amount, 0), 0)), 0)
            FROM created
        ),
        'status_counts', (
            SELECT COALESCE(jsonb_object_agg(status, n), '{}'::jsonb)
            FROM (SELECT status, COUNT(*) AS n FROM created GROUP BY status) s
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_period_summary(timestamptz, timestamptz) TO anon, authenticated;

-- Index cho các lọc theo khoảng thời gian và khoá ngoại hay dùng nhất.
-- Bảng còn nhỏ (dưới 100k dòng) nên tạo mất vài giây; IF NOT EXISTS để chạy lại an toàn.
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_return_time ON orders (return_time) WHERE return_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details (order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_created_at ON order_details (created_at);
CREATE INDEX IF NOT EXISTS idx_order_details_status ON order_details (status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_time ON payments (payment_time);
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs (order_id);
