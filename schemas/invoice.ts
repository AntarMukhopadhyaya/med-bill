import { z } from "zod";

export const invoiceSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  customer_id: z.string().min(1, "Customer is required"),
  order_id: z.string().optional(),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  tax: z.number().min(0, "Tax cannot be negative"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  pdf_url: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
