---
name: using-shadcn-ui
description: Use when building or restyling any screen, form, dialog, table, badge, button or toast in dung_sua_do_hieu, when adding a file under components/ui/, or when tempted to write a raw <button>/<input>/modal overlay with hand-written Tailwind classes.
---

# shadcn/ui trong dự án này

## Overview

UI dựng trên **shadcn/ui** (Radix + Tailwind v4 + `cva`). Component được **copy vào repo**
(`components/ui/<tên-thường>.tsx`), không phải package — sửa trực tiếp được, nhưng sửa ở
một chỗ là đổi cả app. Màu primary là `#7367f0` và chỉ sống trong token `--primary`
(xem skill `tailwind-v4-tokens`). App **chỉ có light mode**.

## Quick reference

| Việc | Cách làm |
| --- | --- |
| Thêm component | `npx shadcn@latest add <name>` (đọc `components.json`). Không tự gõ lại từ docs |
| Gộp class | `cn()` từ `@/lib/utils` — không nối template string |
| Biến thể | `cva` trong file component (`variant`, `size`), không `if` ra chuỗi class |
| Bọc link/thẻ khác | `<Button asChild><Link href=…/></Button>` |
| Modal | `Dialog` (form), `AlertDialog` (xác nhận xoá/huỷ), `Sheet` (sidebar mobile, panel) |
| Thông báo | `toast.success/error(...)` từ `sonner`; `<Toaster />` mount một lần ở layout |
| Chọn khách / tìm kiếm có gợi ý | `Popover` + `Command` |
| Trạng thái đơn/chi tiết | `StatusBadge` (dựa trên `Badge` + `lib/orderStatusUi.ts`, `lib/orderDetailStatusUi.ts`) |
| Loading | `Skeleton` đúng hình dạng nội dung, không spinner toàn trang |
| Phân trang | Vẫn **chỉ** `components/ui/Pagination.tsx` (xem `paginating-lists`) |

## Quy ước tên file

shadcn sinh tên chữ thường (`button.tsx`, `dialog.tsx`). Các component riêng của dự án giữ
PascalCase (`Modal.tsx`, `Pagination.tsx`, `OrderDetailModal.tsx`). Không đổi tên file
PascalCase cũ — nhiều nơi đang import.

`Modal.tsx` và `Toast.tsx` là **lớp tương thích** bọc `Dialog` / `sonner` để chuyển dần.
Code mới dùng thẳng `Dialog` và `toast()`.

## Màu

```tsx
// ĐÚNG
<Button>Lưu</Button>                       // bg-primary
<span className="text-primary" />
<div className="bg-primary/10" />
// SAI
<button className="bg-[#7367f0] hover:bg-[#665ddb]" />
```

Màu trạng thái dùng token `success / warning / info / destructive`, không hex rời.

## Không áp shadcn vào phần in

`InvoicePrint`, `ItemLabelsPrint`, `OrderBarcode`, `components/print/*` render cho máy in
nhiệt 80mm/60mm với CSS `@media print` riêng. Không thay bằng `Card`/`Badge`, không thêm
`cn()` hay class token vào đó. Xem skill `changing-thermal-printing`.

## Common mistakes

- Viết `<div className="fixed inset-0 bg-black/50">` làm modal → mất focus trap, Esc, scroll lock. Dùng `Dialog`.
- Mở `Dialog` lồng `Dialog` bằng z-index tay → Radix tự xếp chồng; bỏ `z-[110]`.
- `Select` của Radix không nhận `value=""` → dùng giá trị sentinel (`"all"`) cho "Tất cả".
- Quên `"use client"` ở file dùng hook nhưng component shadcn thì đã có sẵn.
- Thêm `dark:` class — app light-only, đừng thêm.
- Copy-paste chuỗi class trạng thái vào từng trang thay vì dùng `StatusBadge`.
