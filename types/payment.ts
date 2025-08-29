import { Database } from "@/types/database.types";

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type PaymentAllocation =
  Database["public"]["Tables"]["payment_allocations"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

export interface PaymentWithCustomer extends Payment {
  customers: Customer;
  payment_allocations?: (PaymentAllocation & { invoices: Invoice })[];
}

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "credit_card"
  | "debit_card"
  | "upi"
  | "cheque";

export interface PaymentSummary {
  totalPayments: number;
  totalCount: number;
  thisMonthTotal: number;
  thisMonthCount: number;
  paymentMethods: Record<PaymentMethod, number>;
}

export interface PaymentFilters {
  searchQuery: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
}
