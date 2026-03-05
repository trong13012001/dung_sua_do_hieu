import { getCustomer } from "@/api/customers";
import { useQuery } from "@tanstack/react-query";

export function useGetCustomerDetail(id: number | string) {
    return useQuery({
        queryKey: ['customers', id],
        queryFn: () => getCustomer(id),
        enabled: !!id,
    });
}
