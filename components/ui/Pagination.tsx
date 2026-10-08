'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface PaginationProps {
    /** Trang hiện tại, đếm từ 1. */
    page: number;
    /** Tổng số dòng khớp điều kiện (lấy từ `count` của Supabase, không phải số dòng đang hiển thị). */
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    /** Truyền vào thì hiện ô "Hiển thị mỗi trang". Bỏ trống thì ẩn. */
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    /** Đang tải trang mới — khoá nút để tránh bấm dồn. */
    isFetching?: boolean;
    /** Nhãn đơn vị trong phần đếm, vd "đơn", "khách hàng". */
    unitLabel?: string;
    className?: string;
}

/** Số nút trang hiển thị ở giữa, không tính trang đầu/cuối và dấu "…". */
const WINDOW_SIZE = 5;

/**
 * Dãy nút trang: luôn có trang đầu và trang cuối, ở giữa là cửa sổ quanh trang
 * hiện tại, phần bị lược bỏ thay bằng `null` (hiển thị "…").
 */
function buildPageItems(page: number, totalPages: number): (number | null)[] {
    if (totalPages <= WINDOW_SIZE + 2) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(WINDOW_SIZE / 2);
    let start = Math.max(2, page - half);
    let end = Math.min(totalPages - 1, page + half);

    // Giữ đủ WINDOW_SIZE nút khi trang hiện tại nằm sát đầu hoặc sát cuối.
    if (page - half < 2) end = Math.min(totalPages - 1, WINDOW_SIZE + 1);
    if (page + half > totalPages - 1) start = Math.max(2, totalPages - WINDOW_SIZE);

    const items: (number | null)[] = [1];
    if (start > 2) items.push(null);
    for (let p = start; p <= end; p += 1) items.push(p);
    if (end < totalPages - 1) items.push(null);
    items.push(totalPages);
    return items;
}

export function Pagination({
    page,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    isFetching = false,
    unitLabel,
    className = '',
}: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);

    // Ẩn hẳn khi chỉ có một trang và cũng không cho đổi số dòng.
    if (totalPages <= 1 && !onPageSizeChange) return null;

    const canPrev = safePage > 1 && !isFetching;
    const canNext = safePage < totalPages && !isFetching;
    const firstRow = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const lastRow = Math.min(safePage * pageSize, totalCount);

    const rangeLabel = (
        <>
            {firstRow}–{lastRow} trên {totalCount}
            {unitLabel ? ` ${unitLabel}` : ''}
        </>
    );

    return (
        <div className={cn('flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between', className)}>
            {/* Số dòng mỗi trang */}
            {onPageSizeChange ? (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <label htmlFor="pagination-page-size">Hiển thị mỗi trang</label>
                    <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
                        <SelectTrigger id="pagination-page-size" size="sm" className="w-[76px] bg-card font-medium text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="hidden sm:inline text-xs tabular-nums">{rangeLabel}</span>
                </div>
            ) : (
                <span className="text-xs text-muted-foreground tabular-nums">{rangeLabel}</span>
            )}

            {/* Chuyển trang */}
            {totalPages > 1 && (
                <nav aria-label="Phân trang" className="flex min-w-0 flex-wrap items-center justify-center gap-1 md:justify-end">
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={!canPrev}
                        onClick={() => onPageChange(safePage - 1)}
                        aria-label="Trang trước"
                    >
                        <ChevronLeft />
                    </Button>

                    {buildPageItems(safePage, totalPages).map((item, idx) =>
                        item === null ? (
                            <span
                                key={`gap-${idx}`}
                                className="size-9 flex items-center justify-center text-muted-foreground select-none"
                            >
                                …
                            </span>
                        ) : (
                            <Button
                                key={item}
                                variant={item === safePage ? 'default' : 'ghost'}
                                size="icon"
                                disabled={isFetching}
                                onClick={() => onPageChange(item)}
                                aria-current={item === safePage ? 'page' : undefined}
                                className="tabular-nums"
                            >
                                {item}
                            </Button>
                        ),
                    )}

                    <Button
                        variant="outline"
                        size="icon"
                        disabled={!canNext}
                        onClick={() => onPageChange(safePage + 1)}
                        aria-label="Trang sau"
                    >
                        <ChevronRight />
                    </Button>
                </nav>
            )}
        </div>
    );
}
