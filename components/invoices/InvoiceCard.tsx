import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { InvoiceWithCustomer } from "@/types/invoice";
import { BaseCard, BaseCardAction } from "@/components/shared/BaseCard";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";

interface InvoiceCardProps {
  invoice: InvoiceWithCustomer;
  onViewInvoice: (invoiceId: string) => void;
  onViewCustomer: (customerId: string) => void;
}

const InvoiceCardComponent: React.FC<InvoiceCardProps> = ({
  invoice,
  onViewInvoice,
  onViewCustomer,
}) => {
  // Additional invoice-specific actions
  const additionalActions: BaseCardAction[] = [
    {
      icon: "user",
      colorClass: "text-primary-600",
      backgroundClass: "bg-primary-50",
      onPress: () => onViewCustomer(invoice.customer_id),
      label: "View Customer",
    },
    {
      icon: "file-pdf-o",
      colorClass: "text-warning-600",
      backgroundClass: "bg-warning-50",
      onPress: () => {
        /* Add PDF generation logic */
      },
      label: "Generate PDF",
    },
  ];

  // Customer Info Section
  const infoSection = (
    <TouchableOpacity
      onPress={() => onViewCustomer(invoice.customer_id)}
      className="flex-row items-center gap-2"
    >
      <FontAwesome
        name="user"
        size={14}
        color="rgb(var(--color-primary-500))"
      />
      <VStack className="flex-1 gap-1">
        <Text
          className="text-sm font-semibold text-typography-900"
          numberOfLines={1}
        >
          {invoice.customers.name}
        </Text>
        {invoice.customers.company_name && (
          <Text className="text-xs text-typography-600">
            {invoice.customers.company_name}
          </Text>
        )}
      </VStack>
      <FontAwesome
        name="external-link"
        size={10}
        color="rgb(var(--color-typography-400))"
      />
    </TouchableOpacity>
  );

  // Amount and dates section
  const detailsSection = (
    <VStack className="gap-1">
      <Text className="text-lg font-bold text-primary-600">
        ₹{invoice.amount.toLocaleString()}
      </Text>
      <Text className="text-xs text-typography-500">
        Issued: {new Date(invoice.issue_date).toLocaleDateString()}
      </Text>
    </VStack>
  );

  return (
    <BaseCard
      title={invoice.invoice_number}
      subtitle={`Due: ${
        invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString()
          : "No due date"
      }`}
      onPress={() => onViewInvoice(invoice.id)}
      onEdit={() => {
        /* Add edit logic */
      }}
      onDelete={() => {
        /* Add delete logic */
      }}
      onViewDetails={() => onViewInvoice(invoice.id)}
      additionalActions={additionalActions}
      infoSection={infoSection}
      detailsSection={detailsSection}
    />
  );
};

export const InvoiceCard = memo(InvoiceCardComponent);
