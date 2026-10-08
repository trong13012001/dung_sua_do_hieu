---
name: tailwind-v4-tokens
description: Use when changing colors, radius, shadows, fonts or global CSS, looking for tailwind.config, writing an arbitrary value like bg-[#…], or editing app/globals.css in dung_sua_do_hieu.
---

# Tailwind v4 + token

## Overview

Tailwind **v4, CSS-first**: không có `tailwind.config.*`. Theme nằm trong `app/globals.css`:
biến thô ở `:root`, rồi `@theme inline` ánh xạ sang `--color-*` để sinh class (`bg-primary`,
`text-muted-foreground`, `border-border`…). Plugin duy nhất là `@tailwindcss/postcss`.

Primary của thương hiệu: **`--primary: #7367f0`**. Đổi màu = đổi một dòng token, không sửa component.
App **chỉ light mode**: không có khối dark, không dùng `dark:`.

## Quick reference

| Muốn | Làm |
| --- | --- |
| Màu mới dùng nhiều nơi | Thêm `--x` ở `:root` + `--color-x: var(--x)` trong `@theme inline` |
| Nhạt hơn của primary | `bg-primary/10`, `ring-primary/30` — không tạo hex mới |
| Hover của nút primary | `hover:bg-primary/90` |
| Màu trạng thái | `success`, `warning`, `info`, `destructive` |
| Bo góc | `rounded-md` / `rounded-lg` (dẫn từ `--radius`) |
| Animation của shadcn | `tw-animate-css` (đã import trong `globals.css`) |

## Vùng cấm trong `globals.css`

Khối `@media print`, các `@page`, rule `#print-root`, `.invoice-print-area`, `.item-labels-print`
và file `app/thermal-print-mirror.css` điều khiển giấy in nhiệt. Không đổi khi restyle;
mirror phải giữ đồng bộ với `globals.css`. Xem `changing-thermal-printing`.

## Common mistakes

- Tìm `tailwind.config.js` để thêm màu → không tồn tại, thêm vào `@theme inline`.
- `bg-[#7367f0]`, `shadow-[0_0_0_rgba(115,103,240,.4)]` → hardcode, thoát khỏi token.
- `@import "tailwindcss"` hai lần → CSS bị nhân đôi.
- Class dựng động `` `bg-${color}-500` `` → Tailwind không quét được; dùng map tĩnh đủ chuỗi class.
- Đổi `--foreground`/font của `body` mà không kiểm tra preview hoá đơn trên màn hình.
