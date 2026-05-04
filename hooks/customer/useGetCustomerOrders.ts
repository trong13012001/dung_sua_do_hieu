import { getCustomerOrders } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@/lib/types";

export function useGetCustomerOrders(
    customerId: number | string,
    options?: { enabled?: boolean }
) {
    const idOk = !!customerId;
    const enabled =
        options?.enabled !== undefined ? options.enabled && idOk : idOk;
    return useQuery({
        queryKey: ['orders', 'customer', customerId],
        queryFn: () => getCustomerOrders(customerId),
        enabled,
    });
}
