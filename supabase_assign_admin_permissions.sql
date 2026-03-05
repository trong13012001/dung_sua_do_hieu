-- Assign ALL permissions to role "Quản trị viên" (Administrator).
-- Run this in Supabase Dashboard → SQL Editor.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Quản trị viên'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
