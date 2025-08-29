import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import {
  FormSection,
  FormInput,
  FormButton,
} from "@/components/FormComponents";
import { CustomerSearch } from "./CustomerSearch";

import { colors, spacing } from "@/components/DesignSystem";
import { InvoiceFormData } from "@/schemas/invoice";

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
    <FormSection title="Invoice Details">
      <View style={{ marginBottom: spacing[4] }}>
        <FormInput
          label="Invoice Number"
          value={formData.invoice_number}
          onChangeText={(v) => onUpdateField("invoice_number", v)}
          error={errors.invoice_number}
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
        label="Issue Date"
        value={formData.issue_date}
        onChangeText={(v) => onUpdateField("issue_date", v)}
        error={errors.issue_date}
        placeholder="YYYY-MM-DD"
      />

      <FormInput
        label="Due Date"
        value={formData.due_date}
        onChangeText={(v) => onUpdateField("due_date", v)}
        error={errors.due_date}
        placeholder="YYYY-MM-DD"
      />

      <FormInput
        label="Amount"
        value={formData.amount.toString()}
        onChangeText={(v) => onUpdateField("amount", parseFloat(v) || 0)}
        keyboardType="numeric"
        error={errors.amount}
        placeholder="0.00"
      />

      <FormInput
        label="Tax Amount"
        value={formData.tax.toString()}
        onChangeText={(v) => onUpdateField("tax", parseFloat(v) || 0)}
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

      <FormInput
        label="PDF URL"
        value={formData.pdf_url || ""}
        onChangeText={(v) => onUpdateField("pdf_url", v)}
        placeholder="Enter PDF URL or file path"
        error={errors.pdf_url}
      />

      <FormButton
        title={isGenerating ? "Generating PDF..." : "Generate & Share PDF"}
        onPress={onGeneratePdf}
        variant="outline"
        disabled={isGenerating || isSubmitting}
      />
    </FormSection>
  );
};
