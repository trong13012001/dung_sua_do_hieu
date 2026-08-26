import { getCustomerOrdersPage, CUSTOMER_ORDERS_PAGE_SIZE } from "@/api/orders";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

export function useGetCustomerOrdersPage(
    customerId: number | string,
    page: number,
    search: string,
    pageSize: number = CUSTOMER_ORDERS_PAGE_SIZE,
) {
    return useQuery({
        queryKey: ["orders", "customer-page", customerId, page, pageSize, search],
        queryFn: () =>
            getCustomerOrdersPage(customerId, page, pageSize, search),
        enabled: !!customerId,
        // Giữ trang cũ trong lúc tải trang mới để danh sách không nhảy về skeleton.
        placeholderData: keepPreviousData,
    });
}
