---
name: nextjs-app-router
description: Use when adding or splitting a page under app/, deciding where a component file lives, adding "use client", lazy-loading a heavy modal or chart, loading fonts, or reading a NEXT_PUBLIC_* variable in dung_sua_do_hieu (Next.js 16, React 19).
---

# Next.js 16 App Router trong dự án này

## Overview

Gần như toàn bộ app là **client component**: auth kiểm ở client (`RequireAuth`), dữ liệu qua
React Query + Supabase anon. Server chỉ có `app/api/users/create/route.ts` (service role).
Đừng chuyển trang sang Server Component để fetch — phân quyền và realtime đang nằm ở client.

## Quick reference

| Việc | Cách làm |
| --- | --- |
| Tách trang lớn | `app/(dashboard)/<route>/_components/*.tsx` (thư mục `_` không thành route). `page.tsx` chỉ ghép |
| Component dùng ở ≥ 2 route | `components/<domain>/` (vd. `components/orders/OrderLogSection.tsx`) |
| `"use client"` | Ở `page.tsx` và file có hook/handler. File con import từ file client đã là client, không cần nhắc lại trừ khi được import từ chỗ khác |
| Modal / chart chỉ hiện khi bấm | `const X = dynamic(() => import('./X'), { ssr: false })` |
| Font | `next/font/google` trong `app/layout.tsx`, gắn biến CSS vào `<html>`; không `@import` font trong CSS |
| `NEXT_PUBLIC_*` | Được inline lúc **build** — đổi trên Vercel phải redeploy. Không dùng cho bí mật |
| Service role | Chỉ `lib/supabase-server.ts` trong route handler / server code |
| Route mới | Thêm vào `ROUTE_PERMISSIONS` (`lib/permissions.ts`) + `<Can>` + seed permission |

## Electron

Bản desktop chỉ load URL Vercel (`electron/main.cjs`). Không dùng API chỉ có trên Node trong
client code; tính năng in đi qua `window.electronThermalPrint` (xem `changing-thermal-printing`).

## Common mistakes

- `useSearchParams()` không bọc `<Suspense>` → build lỗi khi prerender.
- Đọc `window`/`localStorage` trong thân render → lỗi hydration; đọc trong effect hoặc handler.
- Import `recharts` tĩnh ở trang dashboard → bundle lớn ngay lần tải đầu.
- Đặt `lang="en"` cho UI tiếng Việt.
