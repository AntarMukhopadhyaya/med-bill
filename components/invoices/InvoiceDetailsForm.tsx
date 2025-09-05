import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFormContext } from "react-hook-form";
import { colors, spacing } from "@/components/DesignSystem";
import { InvoiceFormData } from "@/schemas/invoice";
import { FormInput, FormButton } from "../FormComponents";
import { CustomerSearch } from "./CustomerSearch";

interface InvoiceDetailsFormProps {
  formData: InvoiceFormData;
  errors: Record<string, string>;
  customers: any[];
  customerSearch: string;
  onCustomerSearch: (search: string) => void;
  onSelectCustomer: (customerId: string, customerName: string) => void;
  onGenerateInvoiceNumber: () => void;
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
  onGenerateInvoiceNumber,
  onUpdateField,
  onGeneratePdf,
  isGenerating,
  isSubmitting,
  calculateTotal,
}) => {
  return (
    <View style={{ padding: spacing[4] }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: spacing[4],
          color: colors.gray[900],
        }}
      >
        Invoice Details
      </Text>

      <View style={{ marginBottom: spacing[4] }}>
        <FormInput
          name="invoice_number"
          label="Invoice Number"
          placeholder="Invoice number"
        />
        <TouchableOpacity
          onPress={onGenerateInvoiceNumber}
          style={{
            marginTop: spacing[2],
            paddingVertical: spacing[1],
            paddingHorizontal: spacing[3],
            backgroundColor: colors.gray[100],
            borderRadius: 6,
            alignSelf: "flex-start",
          }}
        >
          <Text
            style={{
              color: colors.primary[600],
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            Generate New Number
          </Text>
        </TouchableOpacity>
      </View>

      <CustomerSearch
        customers={customers}
        customerSearch={customerSearch}
        onCustomerSearch={onCustomerSearch}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerId={formData.customer_id}
        error={errors.customer_id}
      />

      <FormInput
        name="issue_date"
        label="Issue Date"
        placeholder="YYYY-MM-DD"
      />

      <FormInput name="due_date" label="Due Date" placeholder="YYYY-MM-DD" />

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
          padding: spacing[3],
          backgroundColor: colors.gray[50],
          borderRadius: 8,
          marginBottom: spacing[4],
        }}
      >
        <Text
          style={{ fontSize: 16, fontWeight: "600", color: colors.gray[900] }}
        >
          Total Amount: ₹{calculateTotal().toLocaleString()}
        </Text>
      </View>
    </View>
  );
};
