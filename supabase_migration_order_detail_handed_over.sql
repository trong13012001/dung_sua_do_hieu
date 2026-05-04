-- Giao món từng dòng: thời điểm trao cho khách (partial pickup / trả trước từng món).
ALTER TABLE order_details
ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMPTZ;

COMMENT ON COLUMN order_details.handed_over_at IS 'Khách đã nhận món (giao partial); status dòng có thể Delivered / DeliveredOwing.';
