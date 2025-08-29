import { Database } from "./database.types";

// Base types from database
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Inventory = Database["public"]["Tables"]["inventory"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];

// Extended types with relationships
export interface OrderWithCustomer extends Order {
  customers: Customer;
}

export interface OrderWithCustomerAndItems extends Order {
  customers: Customer;
  order_items: OrderItem[];
}

export interface OrderItemWithInventory extends OrderItem {
  inventory?: Inventory;
}

export interface InvoiceWithCustomer extends Invoice {
  customers: Customer;
}

export interface InvoiceWithOrder extends Invoice {
  orders: OrderWithCustomer;
}

// Workflow types
export interface WorkflowData {
  customer: Customer | null;
  order: Partial<Order> | null;
  orderItems: OrderItem[];
  invoice: Partial<Invoice> | null;
}

// PDF generation types
export interface InvoicePdfData {
  invoice: Invoice;
  customer: Customer;
  order?: OrderWithCustomer;
  orderItems?: OrderItemWithInventory[];
  store?: any;
  logo?: any;
}
