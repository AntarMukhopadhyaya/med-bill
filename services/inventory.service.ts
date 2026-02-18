import { supabase } from "@/lib/supabase";
import {
  InventoryItem,
  InventoryInsert,
  InventoryUpdate,
  InventoryWithAlerts,
  InventoryWithRelations,
} from "@/types/inventory";

export const INVENTORY_PAGE_SIZE = 25;

export interface InventoryQueryParams {
  sortBy: "name" | "quantity" | "price" | "updated_at";
  sortOrder: "asc" | "desc";
}

export async function fetchInventoryPage(
  page: number,
  { sortBy, sortOrder }: InventoryQueryParams
): Promise<InventoryWithAlerts[]> {
  const from = page * INVENTORY_PAGE_SIZE;
  const to = from + INVENTORY_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("inventory")
    .select("*, low_stock_alerts (*)", { count: "exact" })
    .eq("is_active", true)
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);

  if (error) throw error;
  return (data || []) as InventoryWithAlerts[];
}

// Fetch active inventory items for order item selection
export async function fetchAvailableInventoryForOrders(
  searchQuery: string
): Promise<InventoryItem[]> {
  let query = supabase
    .from("inventory")
    .select("*")
    .eq("is_active", true)
    .gt("quantity", 0)
    .order("name");

  if (searchQuery.trim()) {
    query = query.or(
      `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,hsn.ilike.%${searchQuery}%`
    );
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return (data || []) as InventoryItem[];
}

// Fetch a single inventory item with related data for the detail screen
export async function fetchInventoryDetail(
  id: string
): Promise<InventoryWithRelations | null> {
  const { data, error } = await supabase
    .from("inventory")
    .select(
      `
      *,
      order_items:order_items(*, orders(*, customers(*))),
      low_stock_alerts(*),
      inventory_logs(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!data) return null;
  return data as unknown as InventoryWithRelations;
}

// Create a new inventory item
export async function createInventoryItem(
  payload: InventoryInsert | Record<string, any>
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("inventory")
    .insert(payload as any)
    .select()
    .single();

  if (error) throw error;
  return data as InventoryItem;
}

// Update an existing inventory item
export async function updateInventoryItem(
  id: string,
  updates: InventoryUpdate | Record<string, any>
): Promise<InventoryItem> {
  const { data, error } = await (supabase as any)
    .from("inventory")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as InventoryItem;
}

// Delete an inventory item
export async function deleteInventoryItem(id: string): Promise<void> {
  await (supabase as any)
    .from("inventory")
    .update({ is_active: false } as any)
    .eq("id", id)
    .throwOnError();
}
