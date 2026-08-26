import { getCustomers } from "@/api/customers";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

/** `page` đếm từ 0 (khớp `getCustomers`). Màn hình đếm từ 1 và tự trừ đi 1. */
export function useGetCustomer(page = 0, pageSize = 10, searchTerm = '') {
    return useQuery({
        queryKey: ['customers', page, pageSize, searchTerm],
        queryFn: () => getCustomers({ page, pageSize, searchTerm }),
        // Giữ trang cũ trong lúc tải trang mới để danh sách không nháy về skeleton.
        placeholderData: keepPreviousData,
    });
}
