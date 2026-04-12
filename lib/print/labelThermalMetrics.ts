/**
 * Khổ tem XP-235B (58mm) — giữ đồng bộ với `@page item-label-xp235b` trong `app/globals.css`.
 */
export const LABEL_THERMAL_PAGE_HEIGHT_MM = 132 as const;

/** Khối tem (box-sizing: border-box): chừa lề trái vật lý + tránh tràn phải. */
export const LABEL_THERMAL_BLOCK_MAX_WIDTH_MM = 51 as const;

/** Đẩy cả khối tem sang phải (vùng không in của đầu in / driver). */
export const LABEL_THERMAL_BLOCK_MARGIN_LEFT_MM = 2.5 as const;
