import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card, Badge } from "@/components/DesignSystem";
import { InvoiceWithCustomer } from "@/types/invoice";
import { colors, spacing } from "@/components/DesignSystem";

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
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "secondary";
      case "sent":
        return "warning";
      case "paid":
        return "success";
      case "overdue":
        return "error";
      case "cancelled":
        return "error";
      default:
        return "secondary";
    }
  };

  return (
    <TouchableOpacity onPress={() => onViewInvoice(invoice.id)}>
      <Card variant="elevated" padding={4}>
        <View style={{ gap: spacing[3] }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {invoice.invoice_number}
              </Text>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                Due:{" "}
                {invoice.due_date
                  ? new Date(invoice.due_date).toLocaleDateString()
                  : "No due date"}
              </Text>
            </View>
            <Badge
              label={invoice.status}
              variant={getStatusVariant(invoice.status)}
              size="sm"
            />
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.gray[400]}
              style={{ marginLeft: spacing[2] }}
            />
          </View>

          {/* Customer Info */}
          <TouchableOpacity
            onPress={() => onViewCustomer(invoice.customer_id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
              padding: spacing[2],
              backgroundColor: colors.gray[50],
              borderRadius: 6,
            }}
          >
            <FontAwesome name="user" size={14} color={colors.primary[500]} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
                numberOfLines={1}
              >
                {invoice.customers.name}
              </Text>
              {invoice.customers.company_name && (
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  {invoice.customers.company_name}
                </Text>
              )}
            </View>
            <FontAwesome
              name="external-link"
              size={10}
              color={colors.gray[400]}
            />
          </TouchableOpacity>

          {/* Amount and Issue Date */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.primary[600],
                }}
              >
                ₹{invoice.amount.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                Issued: {new Date(invoice.issue_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export const InvoiceCard = memo(InvoiceCardComponent);
