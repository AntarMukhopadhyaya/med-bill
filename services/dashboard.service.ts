import { supabase } from "@/lib/supabase";

export interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
  unpaidInvoices: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    customersResult,
    ordersResult,
    revenueResult,
    pendingOrdersResult,
    lowStockResult,
    unpaidInvoicesResult,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact" }),
    supabase.from("orders").select("id", { count: "exact" }),
    supabase.from("orders").select("total_amount"),
    supabase
      .from("orders")
      .select("id", { count: "exact" })
      .eq("order_status", "pending"),
    supabase
      .from("inventory")
      .select("id", { count: "exact" })
      .lt("quantity", 10),
    supabase
      .from("invoices")
      .select("id", { count: "exact" })
      .neq("status", "paid"),
  ]);

  const totalRevenue =
    revenueResult.data?.reduce(
      (sum: number, order: any) => sum + (order.total_amount || 0),
      0
    ) || 0;

  return {
    totalCustomers: customersResult.count || 0,
    totalOrders: ordersResult.count || 0,
    totalRevenue,
    pendingOrders: pendingOrdersResult.count || 0,
    lowStockItems: lowStockResult.count || 0,
    unpaidInvoices: unpaidInvoicesResult.count || 0,
  };
}
