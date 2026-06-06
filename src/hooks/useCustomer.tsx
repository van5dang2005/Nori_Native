import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Customer, Pagination } from "@/src/types/types";
import { archive_customer, create_customer, CustomerPayload, get_customer_by_id, get_customers, update_customer } from "../services/customerService";
import { CustomerDTO } from "@/src/types/types.DTO";
export const useCustomers = (page: number = 1, search?: string, isArchived?: boolean) => {
  const { data, isLoading } = useQuery<{ data: Customer[], pagination: Pagination }>({
    queryKey: ["customers", page, search, isArchived],
    queryFn: () => get_customers(page, search, isArchived),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  return {
    data: data?.data,
    pagination: data?.pagination,
    isLoading: isLoading,
  };
};
export const useCustomerById = (customerId?: string, enabled = true) => {
  const { data, isLoading, error } = useQuery<Customer>({
    queryKey: ['customer', customerId],
    queryFn: () => get_customer_by_id(customerId!),
    enabled: !!customerId && enabled,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false
  });

  return {
    data: data ?? null,
    isLoading,
    error
  };
};
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation<Customer, Error, Partial<CustomerPayload>>({
    mutationFn: create_customer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<Customer, Error, { id: string; payload: Partial<CustomerPayload> }>({
    mutationFn: ({ id, payload }) => update_customer(id, payload),
    onSuccess: (updatedCustomer) => {
      // Refetch list
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      // (optional) update cache detail nếu có
      queryClient.setQueryData(
        ["customers", updatedCustomer.id],
        updatedCustomer
      );
    },
  });
};
export const useArchiveCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerDTO, Error, { id: string; is_archived: boolean }>({
    mutationFn: ({ id, is_archived }) => archive_customer(id, is_archived),
    onSuccess: (updatedCustomer) => {
      // Refetch list
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      // (optional) update cache detail nếu có
      queryClient.setQueryData(
        ["customers", updatedCustomer.id],
        updatedCustomer
      );
    },
  });
};