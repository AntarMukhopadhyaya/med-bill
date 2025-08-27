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
