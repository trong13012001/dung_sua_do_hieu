-- Tổng hợp số liệu dashboard bằng SQL thay vì kéo dữ liệu về client.
--
-- Lý do: `useDashboardStats` cộng tay `payments.amount` và `customers.total_debt`
-- ở phía client. PostgREST chỉ trả 1000 dòng nên tổng bị tính thiếu rất nhiều
-- (đo thực tế: doanh thu hiện 330.542.000đ trong khi thực tế 12.716.573.838đ;
-- công nợ hiện 31.644.354đ trong khi thực tế 2.111.675.354đ).
--
-- Chạy file này trên Supabase dashboard → SQL Editor.

-- 1) Số liệu tổng quan cho thẻ thống kê ở dashboard.
create or replace function public.get_dashboard_stats()
returns table (
    total_revenue numeric,
    customer_count bigint,
    pending_count bigint,
    total_debt numeric,
    order_count bigint,
    completed_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        (select coalesce(sum(amount), 0) from payments),
        (select count(*) from customers),
        (select count(*) from orders where status in ('New', 'In Progress')),
        (select coalesce(sum(total_debt), 0) from customers),
        (select count(*) from orders),
        (select count(*) from orders where status in ('Ready', 'Completed'));
$$;

-- 2) Doanh thu gộp theo tháng cho biểu đồ.
-- Gộp theo giờ Việt Nam để khớp với cách client tính tháng (giờ máy ở quầy).
create or replace function public.get_monthly_revenue()
returns table (
    month_key text,
    revenue numeric
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        to_char(payment_time at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM') as month_key,
        coalesce(sum(amount), 0) as revenue
    from payments
    group by 1
    order by 1;
$$;

grant execute on function public.get_dashboard_stats() to anon, authenticated;
grant execute on function public.get_monthly_revenue() to anon, authenticated;
