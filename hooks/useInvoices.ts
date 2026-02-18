import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  INVOICES_PAGE_SIZE,
  InvoiceQueryParams,
  fetchInvoicesPage,
  fetchInvoiceDetail,
  createInvoice,
  updateInvoice,
  searchInvoiceCustomers,
  searchOrdersForInvoice,
} from "@/services/invoice.service";
import type { InvoiceWithRelations } from "@/types/invoice";
import type { Customer, OrderWithCustomerAndItems } from "@/types/orders";

// Infinite invoices list
export const useInfiniteInvoices = (params: InvoiceQueryParams) => {
  return useInfiniteQuery({
    queryKey: ["invoices", "infinite", params],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as any[]).length < INVOICES_PAGE_SIZE
        ? undefined
        : allPages.length,
    queryFn: ({ pageParam }) => fetchInvoicesPage(pageParam as number, params),
  });
};

// Delete invoice mutation used by list UIs
export const useInvoiceDeleteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Actual delete logic handled in service layer if needed;
      // keep minimal here to preserve existing behavior.
      const { error } = await (await import("@/lib/supabase")).supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all invoice queries, including infinite lists
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

// Single invoice details for detail/edit screens
export const useInvoiceDetails = (id?: string) => {
  return useQuery<InvoiceWithRelations | null>({
    queryKey: ["invoice-details", id],
    queryFn: () => (id ? fetchInvoiceDetail(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Create invoice mutation
export const useCreateInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, any>) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

// Update invoice mutation
export const useUpdateInvoiceMutation = (id?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Record<string, any>) => {
      if (!id) throw new Error("No invoice ID provided");
      return updateInvoice(id, updates);
    },
    onSuccess: (_, __) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-details", id] });
    },
  });
};

// Customers search for invoice screens
export const useInvoiceCustomers = (search: string) => {
  return useQuery<Customer[]>({
    queryKey: ["invoice-customers", search],
    queryFn: () => searchInvoiceCustomers(search),
    staleTime: 5 * 60 * 1000,
  });
};

// Orders search for invoice screens
export const useOrdersForInvoice = (search: string) => {
  return useQuery<OrderWithCustomerAndItems[]>({
    queryKey: ["orders-for-invoice", search],
    queryFn: () => searchOrdersForInvoice(search),
    staleTime: 5 * 60 * 1000,
  });
};
