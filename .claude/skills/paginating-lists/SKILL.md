---
name: paginating-lists
description: Use when adding, reviewing, or debugging any list, table, dropdown, report, export, or aggregate in dung_sua_do_hieu — Supabase silently truncates every query at 1000 rows, and several screens have already shipped wrong numbers, missing customers, and empty Kanban columns because of it.
---

# Phân trang trong dự án này

## Ba sự thật của PostgREST

| Sự thật | Hậu quả nếu quên |
| --- | --- |
| Trả tối đa **1000 dòng**, cắt **im lặng** | `.limit(5000)` vẫn chỉ ra 1000. Xuất Excel mất 97% dữ liệu mà không báo lỗi |
| `in.(...)` nằm trong **URL** | ~1500 id là HTTP 400. Dashboard chế độ "Năm" từng chết vì URL 35KB |
| `ORDER BY` không unique thì thứ tự **không xác định** | Offset pagination lặp dòng ở trang này, mất dòng ở trang khác |

## Quy tắc 1 — Mọi danh sách phải thuộc đúng một trong ba dạng

| Dạng | Khi nào | Khuôn mẫu |
| --- | --- | --- |
| **Trang-số ở DB** | Danh sách người dùng lướt | `.select("*", { count: "exact" })` + `.range(from, to)` + UI số trang |
| **Lấy hết bằng vòng lặp** | Export, tính toán nền, quan hệ con của một trang | `fetchAllPages` / `fetchByIdChunks` |
| **Trần cứng** | Bảng Kanban, danh sách không thể phân trang | `.limit(N)` **và** hiện chữ "N mới nhất" trên UI |

Không có dạng thứ tư. `.limit()` mà người dùng không nhìn thấy là mất dữ liệu ngầm.

## Quy tắc 2 — `ORDER BY` luôn kết thúc bằng `id`

```ts
.order("created_at", { ascending: false })
.order("id", { ascending: false })   // ← khoá phá hoà, bắt buộc
```

Dữ liệu thật của repo: 1613/3000 đơn trùng `created_at`, 2777/3000 khách trùng `name`
(19 khách cùng tên "A AN"). Thiếu dòng `.order("id")` ở `getCustomers` từng làm
**48 khách không bao giờ hiện ra** dù lật hết trang.

## Quy tắc 3 — Lọc và tìm kiếm ở DB, không ở client

Lọc client trên tập đã bị cắt là lọc trên dữ liệu sai. Ví dụ có thật: màn Công việc
tải 500 dòng mới nhất rồi chia cột, nhưng trạng thái `New` có 69.038 dòng nên nuốt
sạch quota — cột "Hoàn thành" hiện **0 dù thực tế có 1607**.

**Khi một nhóm áp đảo, cấp quota riêng cho từng nhóm** thay vì một rổ chung.

Tìm theo trường ở bảng khác (tên khách, tên món): tra id trước rồi ghép vào `or(...)`,
hoặc lọc qua quan hệ `.select("*, orders!inner(customer_id)").eq("orders.customer_id", id)`.

## Quy tắc 4 — Tổng tiền tính bằng SQL

Không bao giờ kéo dòng về rồi `reduce`. Dashboard từng hiện doanh thu **330.542.000đ**
trong khi thực tế là **12.716.573.838đ**. Dùng hàm SQL (`get_dashboard_stats`,
`get_monthly_revenue`) hoặc `{ count: "exact", head: true }` khi chỉ cần đếm.

## Quy tắc 5 — `in.(...)` phải chia lô

`fetchByIdChunks` chia sẵn 200 id/lô và tự phân trang trong từng lô. Đừng tự nhét
mảng id vào `.in()`.

## Template dùng chung (dùng cái này, đừng tự viết lại)

| Lớp | Thành phần | Ở đâu |
| --- | --- | --- |
| UI | `<Pagination page totalCount pageSize onPageChange onPageSizeChange isFetching unitLabel />` — nút số trang có rút gọn `…`, kèm ô "Hiển thị mỗi trang" | `components/ui/Pagination.tsx` |
| Hook | `useQuery` + `placeholderData: keepPreviousData` | mỗi `hooks/<domain>/` |
| Query | `fetchPage(page, pageSize, build)` → `{ data, count }` | `lib/supabasePaging.ts` |
| Lấy hết | `fetchAllPages` / `fetchByIdChunks` | `lib/supabasePaging.ts` |

Quy ước: **trang đếm từ 1** ở mọi màn hình. Đổi số dòng/trang thì đưa `page` về 1. `<Pagination>` tự ẩn khi chỉ có 1 trang và tự
hiện "1–20 trên 2230 đơn". Đặt lại `page = 1` **ngay tại chỗ đổi từ khoá/tab**, không dùng
`useEffect` (ESLint của repo chặn `setState` đồng bộ trong effect).

Đang dùng ở: `/orders`, `/customers`, `/customers/[id]/orders`, `/returns`.

## Khuôn mẫu code

```ts
// A. Trang-số ở DB — dùng cho màn hình có nút chuyển trang
export async function getThingsPage(page: number, pageSize: number, search?: string) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const from = (safePage - 1) * pageSize;
    let q = supabase.from("things").select("*", { count: "exact" });
    if (search) q = q.or(`name.ilike.%${sanitizeOrFilterValue(search)}%`);
    const { data, error, count } = await q
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + pageSize - 1);
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
}

// B. Lấy hết — export, tính toán nền
const all = await fetchAllPages<Row>((from, to) =>
    supabase.from("things").select("*").order("id", { ascending: true }).range(from, to),
);

// C. Quan hệ con của một trang
const details = await fetchByIdChunks<OrderDetail, number>(orderIds, (ids, from, to) =>
    supabase.from("order_details").select("*").in("order_id", ids)
        .order("id", { ascending: true }).range(from, to),
);
```

Hook đi kèm dùng `placeholderData: keepPreviousData` để danh sách không nháy về skeleton
khi chuyển trang, và `useEffect` đưa `page` về 1 mỗi khi đổi từ khoá / đổi tab.

## Bẫy `or(...)`

Dấu `,` `(` `)` `"` `'` là cú pháp filter của PostgREST. Từ khoá người dùng gõ phải đi
qua `sanitizeOrFilterValue()` trước khi ghép vào chuỗi `or(...)`, nếu không câu truy vấn
hỏng (hoặc bị bẻ) khi khách tên `Anh, Chị`.

## Checklist review

- [ ] Query có thể vượt 1000 dòng? → dạng 1, 2 hoặc 3, không có lựa chọn khác
- [ ] `ORDER BY` kết thúc bằng cột unique?
- [ ] `.in()` đi qua `fetchByIdChunks`?
- [ ] Lọc/tìm kiếm chạy ở DB, không phải `.filter()` sau khi fetch?
- [ ] Có `.reduce()` cộng tiền trên dữ liệu fetch về không? → chuyển sang SQL
- [ ] Trần cứng có hiện lên UI không?
- [ ] Đã đo bằng dữ liệu thật trên bản ghi **lớn nhất**, không phải bản ghi mẫu?

## Quy mô dữ liệu thật (đo 25/08/2026)

order_details 70.966 · orders 32.049 · payments 21.513 · customers 5.637 · order_logs 3.752 · users 4.

Riêng `order_details.status = 'New'` chiếm 69.038 dòng, và khách `CỬA HÀNG RUNWAY`
(id 15) có 2.230 đơn. Đây là hai mẫu thử bắt buộc khi kiểm chứng bất kỳ danh sách nào.
