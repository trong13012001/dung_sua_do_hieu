---
name: charts-and-kanban
description: Use when touching recharts charts on the dashboard, the @hello-pangea/dnd Kanban boards on /tasks or /my-tasks, drag-and-drop status changes, or when the board or charts lag, flicker, or snap back after a drop in dung_sua_do_hieu.
---

# recharts + @hello-pangea/dnd

## Kanban (`app/(dashboard)/tasks`, `my-tasks`)

Mỗi cột là một trạng thái của `order_details`; dữ liệu từ `useAllOrderItems` / `useOrderItems`
(`api/orders.ts`), có **trần 300 dòng/trạng thái** — UI phải hiện trần đó (xem `paginating-lists`).

| Quy tắc | Lý do |
| --- | --- |
| `tasksByColumn` tính bằng `useMemo` theo `[items, filter]` | `reduce` mỗi render làm mọi card render lại khi kéo |
| Card là `memo(TaskCard)` trong `_components/` | Khi kéo, thư viện re-render liên tục; card không đổi không nên render |
| `draggableId` là `String(detail.id)`, `key` cùng giá trị, `index` theo vị trí trong mảng đã memo | id/index không ổn định → card nhảy hoặc lỗi "Unable to find draggable" |
| `onDragEnd` bọc `useCallback`, cập nhật **optimistic** rồi mới gọi mutation | Không optimistic → card bật về cột cũ rồi mới nhảy sang |
| Optimistic dùng `setQueriesData` theo tiền tố key | Key có tham số (`['all-order-items', search]`); xem `react-query-patterns` |
| Lọc theo thợ phải làm ở query khi có thể | Lọc client trên trần 300 làm thiếu việc cũ |
| Không bọc `Draggable` trong `Tooltip`/`Popover` portal | Phá đo vị trí khi kéo |

## Chart (`app/(dashboard)/dashboard`)

| Quy tắc | Lý do |
| --- | --- |
| Tách chart thành component `memo`, data truyền vào đã `useMemo` | Dashboard re-render theo bộ lọc/poll; chart vẽ lại SVG rất tốn |
| Bọc trong `ResponsiveContainer` với chiều cao cố định ở cha | Thiếu chiều cao → chart cao 0 |
| `isAnimationActive={false}` khi dữ liệu > ~100 điểm hoặc refetch định kỳ | Animation chạy lại mỗi lần refetch |
| Màu series lấy từ token (`var(--primary)`, `var(--success)`) | Đồng bộ với theme, không hex rời |
| Tổng/số liệu lấy từ RPC SQL, chart chỉ hiển thị | Xem `optimizing-supabase-queries` |
| Lazy-load bằng `next/dynamic` nếu chart không ở màn đầu | recharts nặng |

## Common mistakes

- Formatter `tickFormatter={(v) => …}` inline trong chart đã memo → định nghĩa ngoài component.
- Tạo `COLUMNS` (cấu hình cột) bên trong component → đưa ra hằng module.
