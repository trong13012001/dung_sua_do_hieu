import { getOrder } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@/lib/types";

export function useGetOrder(orderId: number | string | null) {
    return useQuery({
        queryKey: ['orders', orderId],
        queryFn: () => getOrder(orderId!),
        enabled: !!orderId,
    });
}
