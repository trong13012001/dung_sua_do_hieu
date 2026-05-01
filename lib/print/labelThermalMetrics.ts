/**
 * Khổ tem thực tế hiện tại: khoảng 6x5cm (60mm x 50mm), Portrait.
 */
export const LABEL_THERMAL_PAPER_WIDTH_MM = 50 as const;
export const LABEL_THERMAL_PAGE_HEIGHT_MM = 50 as const;

/** Khối tem (box-sizing: border-box): chừa lề an toàn hai bên cho tem 60mm. */
export const LABEL_THERMAL_BLOCK_MAX_WIDTH_MM = 58 as const;

/** Đẩy cả khối tem sang phải (vùng không in của đầu in / driver). */
export const LABEL_THERMAL_BLOCK_MARGIN_LEFT_MM = 1 as const;
