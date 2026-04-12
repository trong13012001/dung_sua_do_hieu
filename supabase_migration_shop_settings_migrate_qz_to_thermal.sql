-- Một lần: chuyển khóa cũ qz_printer_* sang thermal_printer_* và xóa khóa QZ / chứng chỉ.
-- Chạy sau khi đã có bảng shop_settings.

INSERT INTO shop_settings (key, value, updated_at)
SELECT 'thermal_printer_invoice', s.value, NOW()
FROM shop_settings s
WHERE s.key = 'qz_printer_invoice'
  AND NOT EXISTS (SELECT 1 FROM shop_settings t WHERE t.key = 'thermal_printer_invoice');

UPDATE shop_settings t
SET value = s.value, updated_at = NOW()
FROM shop_settings s
WHERE t.key = 'thermal_printer_invoice'
  AND s.key = 'qz_printer_invoice'
  AND (t.value IS NULL OR TRIM(t.value) = '')
  AND TRIM(s.value) <> '';

INSERT INTO shop_settings (key, value, updated_at)
SELECT 'thermal_printer_label', s.value, NOW()
FROM shop_settings s
WHERE s.key = 'qz_printer_label'
  AND NOT EXISTS (SELECT 1 FROM shop_settings t WHERE t.key = 'thermal_printer_label');

UPDATE shop_settings t
SET value = s.value, updated_at = NOW()
FROM shop_settings s
WHERE t.key = 'thermal_printer_label'
  AND s.key = 'qz_printer_label'
  AND (t.value IS NULL OR TRIM(t.value) = '')
  AND TRIM(s.value) <> '';

DELETE FROM shop_settings
WHERE key IN (
  'qz_enabled',
  'qz_printer_invoice',
  'qz_printer_label',
  'qz_certificate',
  'qz_private_key'
);
