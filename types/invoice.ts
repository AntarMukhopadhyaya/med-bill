import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";
import { Order } from "./orders";
import type { Customer } from "@/types/customers";

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];

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
