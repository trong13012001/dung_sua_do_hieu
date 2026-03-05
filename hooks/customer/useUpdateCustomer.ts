import { updateCustomer } from "@/api/customers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Customer } from "@/lib/types";

export function useUpdateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, customer }: { id: number | string, customer: Partial<Customer> }) => {
            return updateCustomer(id, customer);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
}
