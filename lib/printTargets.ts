/**
 * Phân loại job in (máy vật lý do người dùng chọn trong hộp thoại in).
 * Trình duyệt không gán máy in tự động; dùng cùng `document.title` / CSS @page.
 */
export const PRINT_TARGET_LABEL_XP235B = "xp235b" as const;
export const PRINT_TARGET_INVOICE_XP80C = "xp80c" as const;

export type PrintTarget =
    | typeof PRINT_TARGET_LABEL_XP235B
    | typeof PRINT_TARGET_INVOICE_XP80C;
