import type { Customer } from "@/types/customers";
import type { InventoryItem as Inventory } from "@/types/inventory";
import type { Order, OrderItem } from "@/types/orders";
import type { Invoice } from "@/types/invoice";
import type { Payment } from "@/types/payment";

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
