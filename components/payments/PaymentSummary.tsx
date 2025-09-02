import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { PaymentSummary as PaymentSummaryType } from "@/types/payment";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";

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
      colorClass: "text-primary-500",
      bgColorClass: "bg-primary-50",
      borderColorClass: "border-l-primary-500",
    },
    {
      icon: "calendar" as const,
      label: "This Month",
      value: `₹${summary.thisMonthTotal.toLocaleString()}`,
      count: summary.thisMonthCount,
      colorClass: "text-success-600",
      bgColorClass: "bg-success-50",
      borderColorClass: "border-l-success-500",
    },
  ];

  return (
    <HStack className="mb-6" space="md">
      {summaryCards.map((card, index) => (
        <Box
          key={index}
          className={`flex-1 ${card.bgColorClass} p-4 rounded-xl border-l-4 ${card.borderColorClass}`}
        >
          <HStack className="items-center mb-2" space="sm">
            <FontAwesome
              name={card.icon}
              size={14}
              color={
                card.colorClass.includes("primary") ? "#3B82F6" : "#16A34A"
              }
            />
            <Text className={`text-xs ${card.colorClass} font-semibold`}>
              {card.label}
            </Text>
          </HStack>
          <Text className={`text-lg font-bold ${card.colorClass} mb-1`}>
            {card.value}
          </Text>
          <Text className={`text-xs ${card.colorClass} opacity-80`}>
            {card.count} payments
          </Text>
        </Box>
      ))}
    </HStack>
  );
};
