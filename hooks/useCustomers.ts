import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CUSTOMERS_PAGE_SIZE,
  CustomerQueryParams,
  fetchCustomersPage,
  fetchCustomerById,
  fetchCustomerWithRelations,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/services/customer.service";

// Infinite customers list
export const useInfiniteCustomers = (params: CustomerQueryParams) => {
  return useInfiniteQuery({
    queryKey: ["customers", "infinite", params],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as any[]).length < CUSTOMERS_PAGE_SIZE
        ? undefined
        : allPages.length,
    queryFn: ({ pageParam }) => fetchCustomersPage(pageParam as number, params),
  });
};

// Delete customer mutation for list UIs
export const useCustomerDeleteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      await deleteCustomer(customerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

// Single customer fetch (for edit screen)
export const useCustomer = (id?: string) => {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => fetchCustomerById(id as string),
    enabled: !!id,
  });
};

// Customer with relations (for detail screen)
export const useCustomerDetails = (id?: string) => {
  return useQuery({
    queryKey: ["customer-details", id],
    queryFn: () => fetchCustomerWithRelations(id as string),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Create customer mutation
export const useCreateCustomerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

// Update customer mutation
export const useUpdateCustomerMutation = (id?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => {
      if (!id) throw new Error("No customer ID");
      return updateCustomer(id, {
        ...data,
        updated_at: new Date().toISOString(),
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customer-details", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
