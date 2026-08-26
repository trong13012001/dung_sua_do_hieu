/**
 * Tiện ích phân trang cho PostgREST.
 *
 * Supabase mặc định trả tối đa 1000 dòng mỗi request và **cắt im lặng** — không
 * báo lỗi, không cảnh báo. Query nào có thể vượt 1000 dòng đều phải đi qua đây.
 *
 * Ngoài ra filter `in.(...)` được nhét thẳng vào URL: khoảng 1000+ id là request
 * bị từ chối (HTTP 400). Vì vậy danh sách id phải chia lô trước khi truy vấn.
 */

/** Trần dòng mặc định của Supabase/PostgREST. */
export const SUPABASE_MAX_ROWS = 1000;

/** Số id tối đa cho một filter `in.(...)` — giữ URL ở mức an toàn. */
export const ID_CHUNK_SIZE = 200;

/**
 * Gọi `build(from, to)` lặp lại cho tới khi hết dòng, trả về toàn bộ kết quả.
 * `build` phải kèm `.order(...)` theo một cột duy nhất (thường là `id`), nếu
 * không thứ tự giữa các trang không xác định và dòng sẽ bị lặp/thiếu.
 */
export async function fetchAllPages<T>(
    build: (
        from: number,
        to: number,
    ) => PromiseLike<{ data: T[] | null; error: unknown }>,
    pageSize: number = SUPABASE_MAX_ROWS,
): Promise<T[]> {
    const all: T[] = [];
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await build(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
    }
    return all;
}

/** Chia mảng thành các lô nhỏ. */
export function chunk<T>(items: T[], size: number = ID_CHUNK_SIZE): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

/**
 * Chạy `build` cho từng lô id rồi gộp kết quả. Mỗi lô tự phân trang, nên dùng
 * được cho quan hệ 1-nhiều (vd 200 đơn có thể có hơn 1000 dòng chi tiết).
 */
export async function fetchByIdChunks<T, Id>(
    ids: Id[],
    build: (
        idsChunk: Id[],
        from: number,
        to: number,
    ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
    if (ids.length === 0) return [];
    const results = await Promise.all(
        chunk(ids).map((idsChunk) =>
            fetchAllPages<T>((from, to) => build(idsChunk, from, to)),
        ),
    );
    return results.flat();
}

/** Kết quả chuẩn của một truy vấn phân trang theo trang-số. */
export type PageResult<T> = {
    data: T[];
    /** Tổng số dòng khớp điều kiện, KHÔNG phải số dòng của trang này. */
    count: number;
};

/** Khoảng `range()` cho trang thứ `page` (đếm từ 1). Kẹp về trang 1 nếu đầu vào hỏng. */
export function pageRange(
    page: number,
    pageSize: number,
): { from: number; to: number } {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const from = (safePage - 1) * pageSize;
    return { from, to: from + pageSize - 1 };
}

/**
 * Chạy một truy vấn phân trang và trả về `{ data, count }`.
 *
 * `build` phải tạo query đã có `{ count: "exact" }` trong `select`, đã sắp xếp
 * và kết thúc bằng một cột duy nhất (thường là `id`) — nếu không, dòng sẽ lặp ở
 * trang này và biến mất ở trang khác.
 */
export async function fetchPage<T>(
    page: number,
    pageSize: number,
    build: (
        from: number,
        to: number,
    ) => PromiseLike<{ data: T[] | null; error: unknown; count: number | null }>,
): Promise<PageResult<T>> {
    const { from, to } = pageRange(page, pageSize);
    const { data, error, count } = await build(from, to);
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
}
