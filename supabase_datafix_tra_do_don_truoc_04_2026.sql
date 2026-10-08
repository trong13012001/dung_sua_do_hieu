-- ============================================================
-- Sửa dữ liệu một lần: đơn lập TRƯỚC 01/04/2026 (giờ VN) còn treo "chưa trả"
-- và đã quá ngày hẹn → đánh dấu đã trả đồ.
--
-- Đây là dữ liệu cũ trước khi dùng app: khách đã lấy đồ nhưng đơn chưa từng được
-- bấm "Trả đồ", nên đang dồn hết vào tab "Quá hạn" ở màn Trả đồ.
--
-- Quy tắc giống nút "Trả đồ" (resolveStatusWhenMarkingDelivered, lib/orderStatusUi.ts):
--   đã thu một phần (0 < paid < total) → 'DeliveredOwing' (Trả thiếu tiền)
--   còn lại                            → 'Delivered'      (Đã trả đồ)
-- Công nợ khách KHÔNG đổi: recalculate_customer_debt chỉ cộng total - paid, không xét trạng thái.
-- return_time giữ nguyên (không ghi giờ hiện tại như nút Trả đồ) để số "đơn đã trả hôm nay"
-- trên Dashboard không bị dồn hàng trăm đơn cũ vào ngày chạy script.
--
-- Chạy trong Supabase Dashboard → SQL Editor:
--   BƯỚC 1 chạy riêng, xem số đơn.  BƯỚC 2 chạy sau khi số liệu đúng.
-- ============================================================


-- ------------------------------------------------------------
-- BƯỚC 1 — XEM TRƯỚC (chỉ đọc, không sửa gì)
-- ------------------------------------------------------------
WITH pending AS (
    SELECT o.*
    FROM orders o
    WHERE o.created_at < TIMESTAMPTZ '2026-04-01 00:00:00+07'
      AND o.status IN ('New', 'In Progress', 'Ready', 'Paid')
)
SELECT
    count(*) FILTER (
        WHERE return_time < (date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh')
    )                                                    AS se_cap_nhat_qua_han,
    count(*) FILTER (
        WHERE return_time < (date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh')
          AND COALESCE(paid_amount, 0) > 0 AND COALESCE(paid_amount, 0) < total_amount
    )                                                    AS trong_do_tra_thieu_tien,
    count(*) FILTER (WHERE return_time IS NULL)          AS khong_co_ngay_hen_khong_dong_vao,
    min(created_at)                                      AS don_cu_nhat,
    max(created_at)                                      AS don_moi_nhat
FROM pending;


-- ------------------------------------------------------------
-- BƯỚC 2 — CẬP NHẬT (một transaction; lỗi giữa chừng thì không có gì thay đổi)
-- ------------------------------------------------------------
BEGIN;

CREATE TEMP TABLE datafix_targets ON COMMIT DROP AS
SELECT
    o.id,
    o.status AS old_status,
    CASE
        WHEN COALESCE(o.paid_amount, 0) > 0 AND COALESCE(o.paid_amount, 0) < o.total_amount
            THEN 'DeliveredOwing'
        ELSE 'Delivered'
    END AS new_status,
    COALESCE(o.return_time, o.created_at) AS handed_over_at
FROM orders o
WHERE o.created_at < TIMESTAMPTZ '2026-04-01 00:00:00+07'
  AND o.status IN ('New', 'In Progress', 'Ready', 'Paid')
  AND o.return_time < (date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh');

-- Từng món chưa giao → cùng trạng thái với đơn, thời điểm giao = ngày hẹn trả.
UPDATE order_details d
SET status = t.new_status,
    handed_over_at = t.handed_over_at,
    updated_at = now()
FROM datafix_targets t
WHERE d.order_id = t.id
  AND d.status NOT IN ('Delivered', 'DeliveredOwing');

UPDATE orders o
SET status = t.new_status,
    updated_at = now()
FROM datafix_targets t
WHERE o.id = t.id;

-- Ghi lịch sử đơn để sau này tra được đơn nào do script này đổi.
INSERT INTO order_logs (order_id, action, entity_type, entity_id, old_value, new_value)
SELECT
    t.id, 'order_status', 'order', t.id,
    jsonb_build_object('status', t.old_status),
    jsonb_build_object('status', t.new_status, 'note', 'datafix: đơn trước 04/2026 quá hạn → đã trả đồ')
FROM datafix_targets t;

SELECT new_status, count(*) AS so_don FROM datafix_targets GROUP BY new_status;

COMMIT;
