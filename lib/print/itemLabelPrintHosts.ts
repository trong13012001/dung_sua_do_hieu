const ITEM_LABEL_PRINT_HOST_CLASS = "item-labels-print";

/**
 * `ItemLabelsPrint` đặt `.item-labels-print` trên khối ngoài (cả lô tem) và trên từng dòng
 * (để `closest('.item-labels-print')` của "In tem này" chỉ lấy một món).
 * Khi tìm vùng in toàn bộ modal, chỉ lấy các node **ngoài cùng** — không nằm trong
 * `.item-labels-print` khác — tránh clone nhầm chỉ tem cuối.
 */
export function filterOutermostItemLabelPrintHosts(
    elements: readonly HTMLElement[],
): HTMLElement[] {
    return elements.filter((el) => {
        let p = el.parentElement;
        while (p) {
            if (p.classList.contains(ITEM_LABEL_PRINT_HOST_CLASS)) return false;
            p = p.parentElement;
        }
        return true;
    });
}
