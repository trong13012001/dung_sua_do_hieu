import { deleteCustomer } from "@/api/customers";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number | string) => {
            return deleteCustomer(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
}
