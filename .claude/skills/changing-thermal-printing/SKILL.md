---
name: changing-thermal-printing
description: Use when touching lib/printSmart.ts, lib/print/*, components/print/*, InvoicePrint, ItemLabelsPrint, electron/main.cjs, or anything about silent printing, printer names, XP-80C, XP-235B, @page sizing, invoices printing truncated, blank, or with corrupted fonts.
---

# Changing thermal printing

**Đọc `electron/README.md` trước.** Đó là nguồn chuẩn và chi tiết hơn file này.

## Overview

Trình duyệt không in im lặng được. `lib/printSmart.ts` chọn theo thứ tự: Electron IPC
(`window.electronThermalPrint`, chỉ Windows) → print agent nội bộ → hộp thoại in trình duyệt.

Hai máy in vật lý: hoá đơn **XP-80C**, tem **XP-235B**. Tên máy in lấy từ shop settings (DB),
cache qua `ShopSettingsSync` → `lib/print/shopPrinterCache.ts`, rồi fuzzy-match với
`getPrintersAsync()` trong `electron/main.cjs`.

## Ràng buộc dễ vỡ

| Thứ | Ràng buộc |
| --- | --- |
| `@page` 58mm/80mm | `lib/print/invoiceThermalMetrics.ts` và `electron/main.cjs` phải khớp nhau |
| Hoá đơn dài | Chia thành nhiều print job ngắn tỉ lệ 1:1, giữ `@page` dài (2000mm) |
| Job liên tiếp | Cần giãn cách, nếu không đơn dài bị lỗi font |

## Common mistakes

- **Dùng content-fit / zoom / scale để vừa trang** → driver XP-80C co nhỏ trang ngắn lại, chữ hỏng.
  Đã thử và đã revert: commit `5bc54ac` → `f31145d`. Cách đúng là pagination (commit `e32ca66`).
- **Sửa metrics một bên** → lệch giữa preview web và bản in thật.
- **Coi `npm run build` là verify** → không chứng minh gì. Phải in thử trên máy ở quầy.
