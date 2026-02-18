import { supabase } from "@/lib/supabase";
import {
  SalesData,
  DatabaseHealthMetrics,
  InventoryTurnoverItem,
  CustomerAgingItem,
} from "@/types/reports";

export async function fetchSalesReport(
  startDateIso: string,
  endDateIso: string
): Promise<SalesData> {
  const { data } = await (supabase as any)
    .rpc("get_sales_report_data", {
      p_start_date: startDateIso,
      p_end_date: endDateIso,
    })
    .throwOnError();

  const result = (data as any)?.[0] || {};

  return {
    totalSales: result.total_sales || 0,
    totalOrders: Number(result.total_orders) || 0,
    averageOrderValue: result.average_order_value || 0,
    topCustomers: result.top_customers || [],
    topProducts: result.top_products || [],
    salesByMonth: result.sales_by_month || [],
    orderStatus: result.order_status || {
      paid: 0,
      pending: 0,
    },
  };
}

export async function fetchDatabaseHealthMetrics(): Promise<DatabaseHealthMetrics> {
  const { data, error } = await supabase.rpc("get_database_health_metrics");
  if (error) throw error;
  return data as unknown as DatabaseHealthMetrics;
}

export async function fetchInventoryTurnover(
  startDateIso: string,
  endDateIso: string
): Promise<InventoryTurnoverItem[]> {
  const { data } = await supabase
    .rpc("get_inventory_turnover_report", {
      start_date: startDateIso,
      end_date: endDateIso,
    } as any)
    .throwOnError();

  if (data && (data as any[]).length > 0) {
    const itemIds = (data as any[]).map((item) => item.item_id);
    const { data: inventoryData } = await supabase
      .from("inventory")
      .select("id, restock_at")
      .in("id", itemIds as any);

    return (data as any[]).map((item) => {
      const matchingInventory = (inventoryData as any[])?.find(
        (inv: any) => inv.id === (item as any).item_id
      ) as any;

      return {
        ...(item as any),
        restock_date: matchingInventory?.restock_at,
      } as InventoryTurnoverItem;
    });
  }

  return ((data as any) || []) as InventoryTurnoverItem[];
}

export async function fetchCustomerAgingAnalysis(): Promise<
  CustomerAgingItem[]
> {
  const { data, error } = await supabase.rpc("get_customer_aging_analysis", {
    days_30: 30,
    days_60: 60,
    days_90: 90,
  } as any);

  if (error) {
    console.error("Error fetching customer aging analysis:", error);
    throw error;
  }

  return ((data as any) || []) as CustomerAgingItem[];
}
