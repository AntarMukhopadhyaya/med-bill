import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";

export type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];
export type InventoryInsert =
  Database["public"]["Tables"]["inventory"]["Insert"];
export type InventoryUpdate =
  Database["public"]["Tables"]["inventory"]["Update"];
export type InventoryLog =
  Database["public"]["Tables"]["inventory_logs"]["Row"];
export type LowStockAlert =
  Database["public"]["Tables"]["low_stock_alerts"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];

export interface InventoryWithAlerts extends InventoryItem {
  low_stock_alerts?: LowStockAlert[];
}

export interface Category {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
}

export interface SortOption {
  key: "name" | "quantity" | "price" | "updated_at";
  label: string;
}

export interface OrderWithCustomer extends Order {
  customers: Customer;
}

export interface OrderItemWithOrder extends OrderItem {
  orders: OrderWithCustomer;
}

export interface InventoryWithRelations extends InventoryItem {
  order_items: OrderItemWithOrder[];
  low_stock_alerts: LowStockAlert[];
  inventory_logs: InventoryLog[];
}

export interface InventoryMetrics {
  totalSales: number;
  totalRevenue: number;
  averageOrderQuantity: number;
  lastOrderDate: string | null;
  frequentCustomers: { customer: Customer; orderCount: number }[];
  stockHistory: { date: string; quantity: number }[];
}

export interface StockAlert {
  id: string;
  message: string;
  severity: "low" | "critical" | "out_of_stock";
  createdAt: string;
}
