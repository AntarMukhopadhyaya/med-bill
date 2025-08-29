import React from "react";
import { View, Text } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { PaymentSummary as PaymentSummaryType } from "@/types/payment";
import { colors, spacing } from "@/components/DesignSystem";

interface PaymentSummaryProps {
  summary: PaymentSummaryType;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({ summary }) => {
  const summaryCards = [
    {
      icon: "credit-card" as const,
      label: "Total Payments",
      value: `₹${summary.totalPayments.toLocaleString()}`,
      count: summary.totalCount,
      color: colors.primary[500],
      bgColor: colors.primary[50],
      borderColor: colors.primary[500],
    },
    {
      icon: "calendar" as const,
      label: "This Month",
      value: `₹${summary.thisMonthTotal.toLocaleString()}`,
      count: summary.thisMonthCount,
      color: colors.success[600],
      bgColor: colors.success[50],
      borderColor: colors.success[500],
    },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom: spacing[6],
        gap: spacing[4],
      }}
    >
      {summaryCards.map((card, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            backgroundColor: card.bgColor,
            padding: spacing[4],
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: card.borderColor,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing[2],
            }}
          >
            <FontAwesome
              name={card.icon}
              size={14}
              color={card.color}
              style={{ marginRight: spacing[2] }}
            />
            <Text
              style={{
                fontSize: 12,
                color: card.color,
                fontWeight: "600",
              }}
            >
              {card.label}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: card.color,
              marginBottom: spacing[1],
            }}
          >
            {card.value}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: card.color,
              opacity: 0.8,
            }}
          >
            {card.count} payments
          </Text>
        </View>
      ))}
    </View>
  );
};
