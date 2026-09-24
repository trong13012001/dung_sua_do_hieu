---
name: changing-thermal-printing
description: Use when touching lib/printSmart.ts, lib/print/*, components/print/*, InvoicePrint, ItemLabelsPrint, electron/main.cjs, or anything about silent printing, printer names, XP-80C, XP-235B, @page sizing, invoices printing truncated, blank, too wide, or with corrupted/serif fonts, or labels spilling onto a second sticker.
---

# Changing thermal printing

**Đọc `electron/README.md` trước.** Đó là nguồn chuẩn và chi tiết hơn file này.

## Overview

Trình duyệt không in im lặng được. `lib/printSmart.ts` chọn theo thứ tự: Electron IPC
(`window.electronThermalPrint`, chỉ Windows) → print agent nội bộ → hộp thoại in trình duyệt.

Hai máy in vật lý: hoá đơn **XP-80C**, tem **XP-235B**. Tên máy in lấy từ shop settings (DB),
cache qua `ShopSettingsSync` → `lib/print/shopPrinterCache.ts`, rồi fuzzy-match với
`getPrintersAsync()` trong `electron/main.cjs`.

Mỗi job là một file HTML độc lập do `buildPrintableHtmlFromElement` (`lib/print/buildPrintHtml.ts`)
dựng: clone DOM + **toàn bộ CSS của trang nhét inline**. Electron mở file đó trong cửa sổ ẩn rồi
`webContents.print({ silent: true })`.

## Hiện trạng (đã kiểm tra với code)

| Thứ | Hiện trạng |
| --- | --- |
| Hoá đơn | **Một job duy nhất**, `@page 80mm × 2000mm`, tỉ lệ 1:1. Không có code tách hoá đơn. |
| Tem | Mỗi món một job (`printThermalElementWithStatus` trong `lib/print/thermalPrint.ts`): nghỉ 600ms giữa các job, cứ 5 tem nghỉ ×3, lỗi thì thử lại 1 lần (commit `e32ca66`). |
| CSS của job | Đọc từ stylesheet trang đã nạp (CSSOM), chỉ `fetch` khi không đọc được; không có CSS thì **throw**, không in (commit `522d14c`). |

## Ràng buộc dễ vỡ

| Thứ | Ràng buộc |
| --- | --- |
| Chiều cao `@page` hoá đơn | `THERMAL_INVOICE_HTML_PAGE_HEIGHT_MM` (`invoiceThermalMetrics.ts`) phải khớp fallback 2000mm trong `extractThermalPageSizeMicronsFromHtml` (`electron/main.cjs`) |
| Khổ tem | Job tem dùng `@page 50mm × 50mm` (`labelThermalMetrics.ts`), còn `@page item-label-xp235b` trong `app/globals.css` ghi 60×50 — đang lệch nhau, đổi một bên phải xem bên kia |
| CSS in | Rule `@media print` trong `app/globals.css` phải mirror sang `app/thermal-print-mirror.css` |
| Hoá đơn rất dài | Giới hạn là **khổ giấy tối đa của driver XP-80C** (từng cắt ở ~440mm, mất tổng tiền). Nới trong driver Windows (Paper Size 80×3276mm hoặc form tự tạo), không sửa bằng code |
| Job liên tiếp | Cần giãn cách, nếu không đơn nhiều món bị lỗi font |

## Common mistakes

- **Để job in ra mà không có CSS.** Triệu chứng: font có chân (Times), tên/địa chỉ/ngày dồn xuống
  dưới mã vạch, chữ to lẹm mép trái, một tem tràn sang 2 nhãn; hoá đơn không có đường kẻ, rộng
  quá 80mm. Trước `522d14c` mỗi tem `fetch` lại CSS với `no-store` — đơn nhiều món hay sau một lần
  deploy Vercel (hash CSS cũ trả 404) là dính. Đừng quay lại kiểu tải CSS qua mạng mỗi job.
- **Dùng content-fit / zoom / scale / `@page` ngắn vừa nội dung** → driver XP-80C co cả trang lại,
  chữ li ti. Đã thử trên máy thật (06/2026) và bỏ.
- **Tưởng hoá đơn dài đang được tách job.** Tách hoá đơn từng thêm ở `459513c` / `5bc54ac` nhưng
  đã bị gỡ ở `f31145d`; hiện không có. Chủ shop muốn đơn 40+ món vẫn ra **một tờ liền** → chỉnh
  driver, không tách.
- **Sửa metrics một bên** → lệch giữa preview web và bản in thật.
- **Coi `npm run build` là verify** → không chứng minh gì. Có thể render HTML job bằng Electron
  `printToPDF` ở máy dev (đếm số trang, xem font/layout), nhưng kết luận cuối cùng phải in thử
  trên máy ở quầy.
