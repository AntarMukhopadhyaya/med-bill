import { z } from "zod";

// Common validation rules
const requiredString = z.string().min(1, "This field is required");
const optionalString = z.string().optional();
const positiveNumber = z.number().min(0.01, "Must be greater than 0");
const nonNegativeNumber = z.number().min(0, "Cannot be negative");
const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Customer validation schema
export const customerSchema = z.object({
  name: requiredString,
  email: z
    .string()
    .regex(emailRegex, "Invalid email format")
    .optional()
    .or(z.literal("")),
  phone: z.string().regex(phoneRegex, "Invalid phone number"),
  company_name: optionalString,
  gstin: optionalString,
  billing_address: optionalString,
  shipping_address: optionalString,
  country: optionalString,
});

// Order validation schema
export const orderSchema = z.object({
  order_number: requiredString,
  customer_id: requiredString,
  order_date: z.string().min(1, "Order date is required"),
  order_status: z.enum([
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  delivery_charge: z.number().min(0, "Delivery charge cannot be negative"),
  purchase_order_number: z.string().optional(),
  total_amount: positiveNumber,
  notes: optionalString,
});

// Ledger transaction validation schema
export const ledgerTransactionSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  transaction_type: z.enum(["debit", "credit"]),
  description: z.string().min(1, "Description is required"),
  reference_type: z.string().optional(),
  reference_id: z.string().optional(),
});

export type LedgerTransactionFormData = z.infer<typeof ledgerTransactionSchema>;

// Invoice validation schema
export const invoiceSchema = z.object({
  invoice_number: requiredString,
  customer_id: requiredString,
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: optionalString,
  amount: positiveNumber,
  tax: nonNegativeNumber,
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  // pdf_url generated after PDF export & upload
  pdf_url: z.string().optional().or(z.literal("")),
});

// Inventory validation schema
export const inventorySchema = z.object({
  name: requiredString,
  sku: requiredString,
  category: requiredString,
  description: optionalString,
  unit_price: positiveNumber,
  quantity_in_stock: nonNegativeNumber,
  reorder_level: nonNegativeNumber,
  supplier_info: optionalString,
});

// Types derived from schemas
export type CustomerFormData = z.infer<typeof customerSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type InventoryFormData = z.infer<typeof inventorySchema>;

// Validation helper function
export const validateForm = <T>(
  schema: z.ZodSchema<T>,
  data: any
): { success: boolean; errors: Record<string, string>; data?: T } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, errors: {}, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: "Validation failed" } };
  }
};
