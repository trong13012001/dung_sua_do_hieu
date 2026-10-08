---
name: optimizing-supabase-queries
description: Use when writing or reviewing a supabase-js .from()/.select()/.rpc() call, a mutation that touches several tables, a realtime subscription, or when a screen is slow, sends many requests, or the Network tab shows waterfalls or repeated refetches in dung_sua_do_hieu.
---

# Tối ưu truy vấn Supabase

**REQUIRED BACKGROUND:** `paginating-lists` (trần 1000 dòng, chunk `in.()`, khoá phụ `id`).
Với SQL/index/RPC: skill global `supabase-postgres-best-practices` và `changing-supabase-schema`.

## Quick reference

| Vấn đề | Cách làm |
| --- | --- |
| `select('*')` | Liệt kê cột màn hình cần (xem `enrichOrders` trong `api/orders.ts` làm mẫu) |
| Order → customer → details → payments nối tiếp | Một request với embed: `select('id, ..., customer:customers(id,name,phone), order_details(...), payments(...)')` |
| Chỉ cần đếm | `select('id', { count: 'exact', head: true })` — không tải dòng |
| Cộng tiền / tổng hợp | RPC SQL (`get_dashboard_stats`, `get_monthly_revenue`). Không kéo dòng về `reduce` |
| `in.(...)` danh sách id | `fetchByIdChunks` (`lib/supabasePaging.ts`) — kể cả khi "thường chỉ vài chục" |
| Mutation N bước (update → select → update → rpc…) | Gộp vào một Postgres function; TS gọi `.rpc()` một lần |
| Ghi nhiều dòng | `insert([...])` một lần, không `for` + `await insert` |
| Kiểm tra tồn tại trước khi ghi | Bỏ — để FK/constraint báo lỗi |
| Tìm kiếm gõ phím | Debounce + `count: 'planned'`/không đếm cho gợi ý; `count: 'exact'` chỉ cho bảng phân trang |

## RPC mới phải có fallback

SQL do người dùng tự chạy trên dashboard, nên code có thể lên Vercel trước SQL. Mẫu:

```ts
const { data, error } = await supabase.rpc('get_period_analytics', { p_from, p_to });
if (error?.code === 'PGRST202') return legacyFetchPeriodAnalytics(from, to); // function chưa có
if (error) throw error;
```

Khi người dùng xác nhận đã chạy SQL, so số liệu RPC với fallback trên dữ liệu thật trước khi gỡ fallback.

## Realtime

`hooks/useRealtimeSubscription.ts` nghe `orders`, `order_details`, `payments`. Một lần tạo đơn sinh
hàng chục event. Quy tắc:
- Gom event bằng debounce rồi invalidate **một lần**.
- Chỉ invalidate họ key mà bảng đó ảnh hưởng (`payments` → `stats`, `payments`, đơn; không cần `customers` list nếu debt không đổi).
- Poll dự phòng chỉ cần khi kênh không `SUBSCRIBED`.
- Không mở thêm channel trong component — mọi realtime đi qua hook này (mount một lần ở layout).

## Common mistakes

- Dùng `count: 'exact'` trên bảng 5k+ dòng mỗi lần gõ phím.
- Waterfall `await a; await b;` khi b không phụ thuộc a → `Promise.all`.
- `Promise.all` cho **hàng chục** chunk cùng lúc → hàng chục request song song; giới hạn đồng thời hoặc dùng RPC.
- Sửa `total_debt`/`total_amount` từ TS — đó là việc của trigger/function (`recalculate_customer_debt`).
- Đo "nhanh hơn" bằng cảm giác. Đo bằng số request trong Network tab trước/sau.
