/**
 * Ngày theo giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7, không có giờ mùa hè).
 * Dùng thay cho `new Date(y, m, d)` (giờ trình duyệt) hoặc hậu tố `Z` (giờ UTC) khi cần ranh giới ngày đúng giờ shop.
 */

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** `yyyy-MM-dd` của một thời điểm theo giờ VN (mặc định: bây giờ). */
export function vnYmd(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** ISO (UTC) của 00:00 giờ VN ngày `ymd`. */
export function vnDayStartIso(ymd: string): string {
  return new Date(`${ymd}T00:00:00+07:00`).toISOString();
}

/** ISO (UTC) của 00:00 giờ VN ngày sau `ymd` — cận trên (không gồm) của ngày `ymd`. */
export function vnNextDayStartIso(ymd: string): string {
  const start = new Date(`${ymd}T00:00:00+07:00`);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

/** Số ngày lịch VN từ `fromIso` tới hôm nay (0 = cùng ngày). */
export function vnDaysUntilToday(fromIso: string): number {
  const from = Date.parse(`${vnYmd(new Date(fromIso))}T00:00:00Z`);
  const today = Date.parse(`${vnYmd()}T00:00:00Z`);
  return Math.round((today - from) / (24 * 60 * 60 * 1000));
}

/** `dd/MM/yyyy` theo giờ VN. */
export function formatVnDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: VN_TIME_ZONE });
}
