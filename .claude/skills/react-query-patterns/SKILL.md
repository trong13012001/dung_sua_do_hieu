---
name: react-query-patterns
description: Use when adding or changing a useQuery/useMutation/useInfiniteQuery in api/*.ts or hooks/**, writing an optimistic update, choosing a query key, staleTime or enabled, or when a screen shows stale data, refetches too often, or an optimistic change does not appear.
---

# TanStack Query v5 trong dự án này

## Overview

Mọi truy vấn Supabase đi qua hook trong `api/<domain>.ts` (+ hook mỏng ở `hooks/<domain>/`).
`QueryClient` tạo ở `components/providers/QueryProvider.tsx`. Dữ liệu còn được làm mới bởi
`hooks/useRealtimeSubscription.ts` (realtime + poll dự phòng) — mỗi invalidate ở đó nhân lên
theo số màn đang mở.

## Quick reference

| Việc | Quy tắc |
| --- | --- |
| Query key | Mảng, phần tử đầu là họ dữ liệu: `['orders-page', filters, page, size]`. Tham số nào ảnh hưởng kết quả thì phải có trong key |
| Phụ thuộc id | `enabled: !!id` (hoặc `enabled: open` cho panel thu gọn) |
| Danh sách phân trang | `placeholderData: keepPreviousData` để không nháy trắng khi đổi trang |
| `staleTime` | Danh mục ít đổi (roles, permissions, shop settings, employees): phút. Đơn/chi tiết: mặc định. Analytics kỳ: dài, vì realtime sẽ invalidate khi cần |
| Sau mutation đơn/thanh toán | `invalidateOrderRelatedQueries(qc)` (`api/orders.ts`). Không tự liệt kê key |
| Thêm họ key mới liên quan đơn | Thêm vào `invalidateOrderRelatedQueries` **và** xem có cần thêm vào `useRealtimeSubscription` |
| Lấy một phần dữ liệu | `select: (d) => d.items` để component chỉ re-render khi phần đó đổi |

## Optimistic update: prefix vs exact

`getQueryData` / `setQueryData` khớp **chính xác** key. Key có tham số (`['all-order-items', search]`)
sẽ không khớp `['all-order-items']` → optimistic không chạy, không báo lỗi.

```ts
// ĐÚNG — cập nhật mọi biến thể của key
const snapshots = qc.getQueriesData<Item[]>({ queryKey: ['all-order-items'] });
qc.setQueriesData<Item[]>({ queryKey: ['all-order-items'] }, (old) => old?.map(patch));
// onError: snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
```

Luôn `await qc.cancelQueries({ queryKey })` trước khi patch, để refetch đang chạy không đè lên.

## Common mistakes

- Truyền object mới vào key mỗi render (`{...filters}`) — ổn với Query (hash theo giá trị), nhưng đừng đưa hàm hay Date chưa chuẩn hoá vào key.
- `invalidateQueries({ queryKey: ['stats', 'monthly'] })` ngay sau `['stats']` — thừa, `['stats']` đã khớp tiền tố.
- `refetchInterval` trên từng hook — app đã có poll trung tâm; đừng thêm poll thứ hai.
- `useQuery` trong component row của list → N query. Lấy dữ liệu ở cha, truyền xuống.
- Mutation gọi `refetchQueries` rồi lại `invalidateQueries` cùng key → 2 request.
- Hook không ai dùng vẫn có trong danh sách invalidate là vô hại (không có observer thì không fetch); đừng xoá code cũ chỉ vì lý do này.
