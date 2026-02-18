import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  INVENTORY_PAGE_SIZE,
  InventoryQueryParams,
  fetchInventoryPage,
  fetchInventoryDetail,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchAvailableInventoryForOrders,
} from "@/services/inventory.service";

// Infinite inventory list
export const useInfiniteInventory = (params: InventoryQueryParams) => {
  return useInfiniteQuery({
    queryKey: ["inventory", "infinite", params],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as any[]).length < INVENTORY_PAGE_SIZE
        ? undefined
        : allPages.length,
    queryFn: ({ pageParam }) => fetchInventoryPage(pageParam as number, params),
  });
};

// Grouped inventory mutations for tab UI
export const useInventoryMutations = () => {
  const queryClient = useQueryClient();

  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      return createInventoryItem({
        ...item,
        updated_at: new Date().toISOString(),
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (error) => {
      console.log("Error creating item:", error);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return updateInventoryItem(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteInventoryItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  return { addItemMutation, updateItemMutation, deleteItemMutation };
};

// Create hook for the inventory create screen
export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createInventoryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

// Detail hook for a single inventory item with relations
export const useInventoryDetail = (id?: string) => {
  return useQuery({
    queryKey: ["inventory-detail", id],
    queryFn: () => fetchInventoryDetail(id as string),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Update hook for inventory detail screen
export const useInventoryDetailUpdate = (id?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: any) => {
      if (!id) throw new Error("No inventory ID");
      return updateInventoryItem(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      } as any);
    },
    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (error) => {
      console.error("Error updating inventory item:", error);
    },
  });
};

// Inventory list for order item selection (active items with stock)
export const useOrderInventoryItems = (
  searchQuery: string,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ["inventory", "order-selection", searchQuery],
    queryFn: () => fetchAvailableInventoryForOrders(searchQuery),
    enabled,
  });
};
