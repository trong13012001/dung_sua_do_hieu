In nhiệt (XP-80C / XP-235B) — hướng dẫn nhanh
============================================

1) Electron (silent trên Windows)

   - Build: `npm run dist:electron:win` (xem `electron/README.md`).
   - Chạy app Electron; preload expose `electronThermalPrint.printHtmlSilent`.
   - URL: `ELECTRON_START_URL` / `NEXT_PUBLIC_APP_URL`.

2) Tên máy in (Cài đặt shop hoặc .env.local)

   NEXT_PUBLIC_THERMAL_PRINTER_INVOICE=Tên máy in XP-80C trong Windows
   NEXT_PUBLIC_THERMAL_PRINTER_LABEL=Tên máy in tem XP-235B trong Windows

3) Windows — agent localhost (không Electron)

   `tools/silent-print-agent` + `NEXT_PUBLIC_PRINT_AGENT_URL=http://127.0.0.1:17880`

4) Tuỳ chọn: ép hóa đơn qua dialog Chrome

   NEXT_PUBLIC_THERMAL_INVOICE_BROWSER_PRINT=1

Luồng ưu tiên: Electron silent → agent (nếu có URL) → dialog.

CSS mirror in-app: `app/thermal-print-mirror.css`. HTML job: `lib/print/buildPrintHtml.ts`.

Nâng cấp từ DB cũ (tên máy in lưu theo khóa cũ): chạy một lần file SQL
`supabase_migration_shop_settings_migrate_qz_to_thermal.sql` trong Supabase SQL editor.
