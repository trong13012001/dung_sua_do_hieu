import { getCustomers } from "@/api/customers";
import { useQuery } from "@tanstack/react-query";

export function useGetCustomer(page = 0, pageSize = 10, searchTerm = '') {
    return useQuery({
        queryKey: ['customers', page, pageSize, searchTerm],
        queryFn: () => getCustomers({ page, pageSize, searchTerm }),
    });
}