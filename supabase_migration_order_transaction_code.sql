-- Mã giao dịch 11 số giống WPF (taoMaGD): yymmdd + 3 chữ số thứ tự trong ngày + "00"
-- Múi giờ: Asia/Ho_Chi_Minh (khớp DateTime.Now trên máy VN).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_code TEXT;

-- Gán mã cho đơn cũ (theo ngày VN + thứ tự id trong ngày)
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY (timezone('Asia/Ho_Chi_Minh', created_at))::date
      ORDER BY id
    ) AS rn,
    (timezone('Asia/Ho_Chi_Minh', created_at))::date AS d
  FROM orders
  WHERE transaction_code IS NULL OR btrim(transaction_code) = ''
)
UPDATE orders o
SET transaction_code =
  to_char(r.d, 'YY') || to_char(r.d, 'MM') || to_char(r.d, 'DD') || lpad(r.rn::text, 3, '0') || '00'
FROM ranked r
WHERE o.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS orders_transaction_code_unique
  ON orders (transaction_code)
  WHERE transaction_code IS NOT NULL AND btrim(transaction_code) <> '';

CREATE OR REPLACE FUNCTION orders_set_transaction_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  vn_date date;
  prefix text;
  cnt int;
  seq int;
  code text;
BEGIN
  IF NEW.transaction_code IS NOT NULL AND btrim(NEW.transaction_code) <> '' THEN
    RETURN NEW;
  END IF;

  vn_date := (COALESCE(NEW.created_at, NOW()) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  prefix := to_char(vn_date, 'YY') || to_char(vn_date, 'MM') || to_char(vn_date, 'DD');

  PERFORM pg_advisory_xact_lock(hashtext('orders_tx_' || prefix));

  SELECT COUNT(*)::int INTO cnt
  FROM orders
  WHERE transaction_code IS NOT NULL
    AND btrim(transaction_code) <> ''
    AND length(transaction_code) = 11
    AND left(transaction_code, 6) = prefix;

  seq := cnt + 1;
  IF seq > 999 THEN
    RAISE EXCEPTION 'Vượt quá 999 giao dịch trong ngày (prefix %)', prefix;
  END IF;

  code := prefix || lpad(seq::text, 3, '0') || '00';
  NEW.transaction_code := code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_orders_set_transaction_code ON orders;
CREATE TRIGGER tr_orders_set_transaction_code
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE PROCEDURE orders_set_transaction_code();
