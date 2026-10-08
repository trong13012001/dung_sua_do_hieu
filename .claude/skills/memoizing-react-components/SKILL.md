---
name: memoizing-react-components
description: Use when rendering a list, table, Kanban column or grid of rows/cards, when passing callbacks or objects to child components, when computing filtered/grouped/sorted data during render, or when a screen re-renders or lags while typing in dung_sua_do_hieu.
---

# memo / useMemo / useCallback

## Overview

React Compiler **không bật** (quyết định có chủ đích). Memo làm tay, **có chọn lọc**: chỉ ở chỗ
đo được lợi ích. Memo sai chỗ chỉ thêm code và so sánh thừa.

## Khi nào dùng

| Công cụ | Dùng khi | Không dùng khi |
| --- | --- | --- |
| `memo(Row)` | Component render trong `.map` của list dài (đơn, chi tiết, khách, card Kanban), hoặc con nặng (chart) dưới cha hay re-render (ô tìm kiếm, timer) | Component render một lần, hoặc nhận `children` mới mỗi lần |
| `useCallback` | Handler truyền xuống component đã `memo`, hoặc nằm trong deps của effect/hook khác | Handler chỉ gắn vào `<button>` DOM thường |
| `useMemo` | Lọc/sort/group mảng (`tasksByColumn`, tổng tiền kỳ), object/array truyền vào component `memo` hoặc vào deps | Phép tính rẻ (`a + b`, `.length`, format một chuỗi) |

## Khuôn row chuẩn

```tsx
// Cha
const handleOpen = useCallback((id: number) => setSelectedId(id), []);
const visible = useMemo(() => orders.filter(matches(query)), [orders, query]);
{visible.map((o) => <OrderRow key={o.id} order={o} onOpen={handleOpen} />)}

// Con — _components/OrderRow.tsx
export const OrderRow = memo(function OrderRow({ order, onOpen }: Props) {
  return <TableRow onClick={() => onOpen(order.id)}>…</TableRow>; // arrow bên trong con thì ổn
});
```

Handler nhận **id**, không tạo `() => open(o.id)` ở cha cho từng row — điều đó phá `memo`.

## Những thứ âm thầm phá memo

- Prop `style={{…}}`, `options={[…]}`, `labels={{…}}` viết inline → hằng số đưa ra ngoài component hoặc `useMemo`.
- Truyền cả object `order` đã bị `map` tạo mới mỗi render (`orders.map(o => ({...o, x}))` không memo).
- `key={index}` trên list có thể sắp xếp lại.
- Cha truyền `children` JSX → luôn là object mới.

## Luật ESLint (`eslint-plugin-react-hooks` v7, qua `eslint-config-next`)

- `set-state-in-effect`: không `setState` đồng bộ trong `useEffect` để "reset" theo prop — reset ngay trong handler (vd. `setPage(1)` khi đổi bộ lọc), hoặc dẫn xuất bằng `useMemo`.
- `exhaustive-deps`: đừng tắt rule để giữ callback "ổn định" — dùng `useCallback` với deps đúng, hoặc ref cho giá trị mới nhất.
- `purity`: không gọi `Date.now()` / `Math.random()` trong render.

## Kiểm chứng

React DevTools Profiler → "Highlight updates": gõ vào ô tìm kiếm, chỉ ô input và list đã lọc được nháy; các row không đổi không nháy.
