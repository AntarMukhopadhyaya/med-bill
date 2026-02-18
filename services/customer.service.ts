import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types/customers";

export const CUSTOMERS_PAGE_SIZE = 25;

export interface CustomerQueryParams {
  searchQuery: string;
  sortBy: "name" | "created_at" | "last_order";
  sortOrder: "asc" | "desc";
  filterStatus: string;
}

export async function fetchCustomersPage(
  page: number,
  { searchQuery, sortBy, sortOrder }: CustomerQueryParams,
): Promise<Customer[]> {
  const from = page * CUSTOMERS_PAGE_SIZE;
  const to = from + CUSTOMERS_PAGE_SIZE - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .range(from, to);

  if (searchQuery.trim()) {
    query = query.or(
      `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`,
    );
  }

  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Customer[];
}

// Fetch a single customer by id
export async function fetchCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return (data || null) as Customer | null;
}

// Fetch customer with related orders and invoices for the detail screen
export async function fetchCustomerWithRelations(id: string): Promise<any> {
  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      *,
      orders(*),
      invoices(*)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.log(error);
    throw error;
  }
  return data;
}

// Create a new customer
export async function createCustomer(
  payload: Partial<Customer>,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert(payload as any)
    .select()
    .single();

  if (error) throw error;
  return data as Customer;
}

// Update an existing customer
export async function updateCustomer(
  id: string,
  updates: Partial<Customer>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("customers")
    .update(updates as any)
    .eq("id", id);
  if (error) throw error;
}

// Delete customer by id
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
