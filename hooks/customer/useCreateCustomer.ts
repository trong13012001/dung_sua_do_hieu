import { createCustomer } from "@/api/customers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Customer } from "@/lib/types";

export function useCreateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (customer: Partial<Customer>) => {
            return createCustomer(customer);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
}