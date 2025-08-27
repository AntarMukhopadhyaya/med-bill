import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];

export interface InvoiceWithCustomer extends Invoice {
  customers: Customer;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface StatusOption {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
}

export interface InvoicesPageParams {
  customerId?: string;
}
