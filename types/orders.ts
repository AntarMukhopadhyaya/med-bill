import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];

export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Product = Database["public"]["Tables"]["inventory"]["Row"];
export interface OrderWithCustomer extends Order {
  customers: Customer;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface StatusOption {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
}

export interface OrdersPageParams {
  customerId?: string;
}

export interface OrderWithRelations {
  id: string;
  created_at: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  order_status: string;
  total_amount: number;
  order_notes: string | null;
  customers: Customer;
  order_items: (OrderItem & { inventory: Product })[];
}

export interface MenuItem {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  onPress: () => void;
  color?: string;
}
