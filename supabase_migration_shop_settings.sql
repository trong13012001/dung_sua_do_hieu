-- Shop settings: key-value store for shop info, máy in nhiệt, v.v.
CREATE TABLE IF NOT EXISTS shop_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults (skip if already present)
INSERT INTO shop_settings (key, value)
SELECT k, v FROM (VALUES
    ('shop_name',            'DŨNG SỬA ĐỒ HIỆU'),
    ('shop_hotline',         '0904672288'),
    ('shop_address',         ''),
    ('bank_name',            'Techcombank'),
    ('bank_account',         '1902 9116 9690 16'),
    ('bank_account_holder',  'Nguyễn Thu Hằng'),
    ('thermal_printer_invoice', ''),
    ('thermal_printer_label',     '')
) AS seed(k, v)
WHERE NOT EXISTS (SELECT 1 FROM shop_settings WHERE shop_settings.key = seed.k);

-- Add manage_settings permission if not present
INSERT INTO permissions (name)
SELECT 'manage_settings'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage_settings');

-- Grant manage_settings to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name = 'manage_settings'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
