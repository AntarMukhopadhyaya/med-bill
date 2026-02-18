import { supabase } from "@/lib/supabase";
import { toISODateStringLocal } from "@/lib/date";
import {
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceWithCustomer,
  InvoiceWithRelations,
} from "@/types/invoice";
import type { Customer } from "@/types/customers";
import type { OrderWithCustomerAndItems } from "@/types/orders";

export const INVOICES_PAGE_SIZE = 20;

export interface InvoiceQueryParams {
  searchQuery: string;
  statusFilter: string;
  customerId?: string | string[];
}

export async function fetchInvoicesPage(
  page: number,
  { searchQuery, statusFilter, customerId }: InvoiceQueryParams,
): Promise<InvoiceWithCustomer[]> {
  const from = page * INVOICES_PAGE_SIZE;
  const to = from + INVOICES_PAGE_SIZE - 1;

  let query = supabase
    .from("invoices")
    .select("*, customers(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (customerId) {
    query = query.eq("customer_id", customerId as any);
  }

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (searchQuery.trim()) {
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .or(`name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);

    const customerIds =
      (matchingCustomers as { id: string }[])?.map((c) => c.id) || [];

    if (customerIds.length > 0) {
      query = query.or(
        `invoice_number.ilike.%${searchQuery}%,customer_id.in.(${customerIds.join(
          ",",
        )})`,
      );
    } else {
      query = query.ilike("invoice_number", `%${searchQuery}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as InvoiceWithCustomer[];
}

export async function fetchInvoiceDetail(
  id: string,
): Promise<InvoiceWithRelations | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      customers(*),
      orders(*)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as unknown as InvoiceWithRelations;
}

export async function createInvoice(
  payload: InvoiceInsert | Record<string, any>,
): Promise<InvoiceWithRelations> {
  const { data, error } = await supabase
    .from("invoices")
    .insert(payload as any)
    .select(
      `
      *,
      customers(*),
      orders(*)
    `,
    )
    .single();

  if (error) throw error;
  return data as unknown as InvoiceWithRelations;
}

export async function updateInvoice(
  id: string,
  updates: InvoiceUpdate | Record<string, any>,
): Promise<InvoiceWithRelations> {
  const { data, error } = await (supabase as any)
    .from("invoices")
    .update(updates as any)
    .eq("id", id)
    .select(
      `
      *,
      customers(*),
      orders(*)
    `,
    )
    .single();

  if (error) throw error;
  return data as unknown as InvoiceWithRelations;
}

export async function updateInvoicePdfUrl(
  id: string,
  pdfUrl: string,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("invoices")
    .update({ pdf_url: pdfUrl } as any)
    .eq("id", id);

  if (error) throw error;
}

export async function fetchInvoiceByOrderId(
  orderId: string,
): Promise<InvoiceWithRelations | null> {
  if (!orderId) return null;

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      customers(*),
      orders(*)
    `,
    )
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as unknown as InvoiceWithRelations;
}

export async function getOrCreateInvoiceForOrder(params: {
  orderId: string;
  customerId: string;
  subtotal: number;
  totalTax: number;
  deliveryCharge: number;
  generateInvoiceNumber: () => string;
}): Promise<InvoiceWithRelations> {
  const existing = await fetchInvoiceByOrderId(params.orderId);
  if (existing) return existing;

  const now = new Date();
  const invoice_number = params.generateInvoiceNumber();

  const payload: InvoiceInsert = {
    invoice_number,
    order_id: params.orderId,
    customer_id: params.customerId,
    issue_date: toISODateStringLocal(now),
    due_date: toISODateStringLocal(now),
    amount: params.subtotal,
    tax: params.totalTax,
    delivery_charge: params.deliveryCharge,
    pdf_url: "",
  } as InvoiceInsert;

  return await createInvoice(payload);
}

export async function searchInvoiceCustomers(
  search: string,
): Promise<Customer[]> {
  let query = supabase.from("customers").select("*").order("name");

  if (search.trim()) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(20);
  if (error) throw error;
  return (data || []) as Customer[];
}

export async function searchOrdersForInvoice(
  search: string,
): Promise<OrderWithCustomerAndItems[]> {
  let query = supabase
    .from("orders")
    .select(
      `*, customers(*), order_items(id, item_name, quantity, unit_price, total_price)`,
    )
    .order("created_at", { ascending: false });

  if (search.trim()) {
    query = query.or(`order_number.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(20);
  if (error) throw error;
  return (data || []) as OrderWithCustomerAndItems[];
}
