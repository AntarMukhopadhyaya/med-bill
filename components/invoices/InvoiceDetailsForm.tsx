import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFormContext } from "react-hook-form";
import { InvoiceFormData } from "@/schemas/invoice";
import { FormDateInput, FormInput, FormButton } from "../FormComponents";
import { CustomerSearch } from "./CustomerSearch";

interface InvoiceDetailsFormProps {
  formData: InvoiceFormData;
  errors: Record<string, string>;
  customers: any[];
  customerSearch: string;
  onCustomerSearch: (search: string) => void;
  onSelectCustomer: (customerId: string, customerName: string) => void;
  onUpdateField: (field: keyof InvoiceFormData, value: any) => void;
  onGeneratePdf: () => void;
  isGenerating: boolean;
  isSubmitting: boolean;
  calculateTotal: () => number;
}

export const InvoiceDetailsForm: React.FC<InvoiceDetailsFormProps> = ({
  formData,
  errors,
  customers,
  customerSearch,
  onCustomerSearch,
  onSelectCustomer,
  onUpdateField,
  onGeneratePdf,
  isGenerating,
  isSubmitting,
  calculateTotal,
}) => {
  return (
    <View style={{ padding: 16 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 16,
          color: "#111827",
        }}
      >
        Invoice Details
      </Text>

      <View style={{ marginBottom: 16 }}>
        <FormInput
          name="invoice_number"
          label="Invoice Number"
          placeholder={
            formData.order_id
              ? "Invoice number from order"
              : "Select an order to set invoice number"
          }
          disabled
        />
      </View>

      <CustomerSearch
        customers={customers}
        customerSearch={customerSearch}
        onCustomerSearch={onCustomerSearch}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerId={formData.customer_id}
        error={errors.customer_id}
      />

      <FormDateInput name="issue_date" label="Issue Date" required />

      <FormDateInput name="due_date" label="Due Date" required />

      <FormInput
        name="amount"
        label="Amount"
        keyboardType="numeric"
        placeholder="0.00"
      />

      <FormInput
        name="tax"
        label="Tax Amount"
        keyboardType="numeric"
        placeholder="0.00"
      />

      <View
        style={{
          padding: 12,
          backgroundColor: "#f9fafb",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
          Total Amount: ₹{calculateTotal().toLocaleString()}
        </Text>
      </View>
    </View>
  );
};
