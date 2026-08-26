---
name: changing-supabase-schema
description: Use when a task needs a new table, column, index, constraint, Postgres function or trigger in dung_sua_do_hieu, or when writing any SQL for it — this repo has no ORM and no migration CLI, and agents cannot apply the SQL themselves.
---

# Changing the Supabase schema

## Overview

Schema được áp **bằng tay** qua Supabase dashboard. `supabase_schema.sql` là bản dump chuẩn;
mỗi `supabase_migration_*.sql` ở gốc repo là một thay đổi đã áp một lần.

## Đọc SQL trước khi viết TypeScript

Nhiều business logic nằm trong Postgres function/trigger: `increment_order_payment`,
`recalculate_customer_debt`, trigger sinh `transaction_code` 11 số, và `customers.total_debt`
là giá trị **được tính lại bởi trigger** — không bao giờ ghi trực tiếp từ TS.
Grep `supabase_schema.sql` trước khi cho rằng logic đó chưa tồn tại.

## Quick reference

| Việc | File phải sửa |
| --- | --- |
| Đổi bảng/cột | `supabase_migration_<mô_tả>.sql` (mới) + `supabase_schema.sql` |
| Đổi hình dạng dữ liệu | `lib/types.ts` (mirror viết tay của schema) |
| Thêm route/hành động cần quyền | `lib/permissions.ts` (`ROUTE_PERMISSIONS`) **và** `<Can>` ở UI **và** seed permission trong `supabase_schema.sql` |
| Thêm query/mutation | `api/<domain>.ts`; sau mutation đơn hàng gọi `invalidateOrderRelatedQueries(qc)` |

## Common mistakes

- **Viết lại logic của trigger bằng TS** → số liệu lệch, vì trigger vẫn chạy.
- **Chỉ sửa một trong hai cơ chế phân quyền** → menu hiện nhưng nút ẩn, hoặc ngược lại.
- **Tự ý áp SQL** → agent không có quyền chạy trên dashboard. Viết file, rồi nói rõ người dùng phải tự chạy.
- **Dùng `SUPABASE_SERVICE_ROLE_KEY` ở client** → chỉ được dùng trong `lib/supabase-server.ts` / API route.
- **Query không phân trang** → PostgREST cắt ở 1000 dòng. Xem skill `verifying-changes`.
