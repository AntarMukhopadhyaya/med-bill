import { supabase } from "@/lib/supabase";
import {
  Order,
  OrderInsert,
  OrderItem,
  OrderWithCustomer,
  OrderWithRelations,
} from "@/types/orders";

export const ORDERS_PAGE_SIZE = 20;

export interface OrderQueryParams {
  searchQuery: string;
  statusFilter: string;
  customerId?: string | string[];
}

export async function fetchOrderWithRelations(
  orderId: string
): Promise<OrderWithRelations | null> {
  if (!orderId) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      customers(*),
      order_items(*, inventory(*))
    `
    )
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data as unknown as OrderWithRelations;
}

export async function createOrder(order: OrderInsert): Promise<Order> {
  const { data: orderData, error } = await supabase.rpc(
    "create_order_with_number",
    {
      p_customer_id: order.customer_id,
      p_order_date: order.order_date,
      p_order_status: order.order_status,
      p_subtotal: order.subtotal,
      p_total_tax: order.total_tax,
      p_delivery_charge: order.delivery_charge,
      p_purchase_order_number: order.purchase_order_number || null,
      p_total_amount: order.total_amount,
      p_notes: order.notes,
    } as any
  );
  if (error) {
    console.error("Error creating order:", error);
    throw error;
  }
  return orderData as Order;
}

export async function createOrderItem(
  orderItem: OrderItem
): Promise<OrderItem> {
  const { data, error } = await supabase
    .from("order_items")
    .insert(orderItem as any)
    .single();
  if (error) {
    console.error("Error creating order item:", error);
    throw error;
  }
  return data as OrderItem;
}

export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
}

export async function markOrderPaid(orderId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("orders")
    .update({
      order_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
}

export async function fetchOrdersPage(
  page: number,
  { searchQuery, statusFilter, customerId }: OrderQueryParams
): Promise<OrderWithCustomer[]> {
  const from = page * ORDERS_PAGE_SIZE;
  const to = from + ORDERS_PAGE_SIZE - 1;

  let query = supabase
    .from("orders")
    .select("*, customers(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (customerId) {
    query = query.eq("customer_id", customerId as any);
  }

  if (statusFilter !== "all") {
    query = query.eq("order_status", statusFilter);
  }

  if (searchQuery.trim()) {
    query = query.or(`order_number.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as OrderWithCustomer[];
}
