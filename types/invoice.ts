import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";
import { Order } from "./orders";

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

export interface InvoiceWithRelations {
  id: string;
  created_at: string;
  invoice_number: string;
  customer_id: string;
  order_id: string | null;
  issue_date: string;
  due_date: string;
  amount: number;
  tax: number;
  delivery_charge: number | null;
  notes: string | null;
  pdf_url?: string | null;
  customers: Customer;
  orders: Order | null;
}
