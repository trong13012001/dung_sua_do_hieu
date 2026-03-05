-- Fix: "null value in column "id" of relation "users" violates not-null constraint"
--
-- Có 2 trường hợp:
--
-- 1) users.id là UUID (liên kết auth.users.id):
--    Không cần chạy file này. API đã gửi id = auth.user.id khi tạo nhân viên.
--
-- 2) users.id là BIGINT (tự tăng):
--    Chạy đoạn SQL bên dưới nếu cột id chưa có default.

-- 1. Ensure a sequence exists for users.id
CREATE SEQUENCE IF NOT EXISTS users_id_seq;

-- 2. Set id default to the next value from the sequence
ALTER TABLE users
  ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

-- 3. Sync sequence so next value is greater than any existing id (avoid duplicate key)
SELECT setval(
  'users_id_seq',
  (SELECT COALESCE(MAX(id), 0) FROM users)
);
