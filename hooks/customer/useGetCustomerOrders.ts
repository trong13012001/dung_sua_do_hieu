import { getCustomerOrders } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@/lib/types";

export function useGetCustomerOrders(customerId: number | string) {
    return useQuery({
        queryKey: ['orders', 'customer', customerId],
        queryFn: () => getCustomerOrders(customerId),
        enabled: !!customerId,
    });
}
