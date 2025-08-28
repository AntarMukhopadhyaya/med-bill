// Types
export interface SalesData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topCustomers: Array<{
    name: string;
    totalSpent: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
  paymentStatus: {
    paid: number;
    pending: number;
    overdue: number;
  };
}

export interface DatabaseHealthMetrics {
  total_customers: number;
  total_orders: number;
  total_inventory_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_invoices: number;
  unpaid_invoices: number;
  total_revenue_this_month: number;
  last_updated: string;
}

export interface InventoryTurnoverItem {
  item_id: string;
  item_name: string;
  opening_stock: number;
  closing_stock: number;
  total_sold: number;
  turnover_ratio: number;
  days_of_stock: number;
}
