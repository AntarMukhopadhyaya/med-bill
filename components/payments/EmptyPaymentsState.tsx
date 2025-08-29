import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { EmptyState } from "@/components/DesignSystem";
import { colors, spacing } from "@/components/DesignSystem";

interface EmptyPaymentsStateProps {
  searchQuery: string;
  onCreatePayment: () => void;
  onClearFilters: () => void;
}

export const EmptyPaymentsState: React.FC<EmptyPaymentsStateProps> = ({
  searchQuery,
  onCreatePayment,
  onClearFilters,
}) => {
  const hasFilters = !!searchQuery;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing[8],
      }}
    >
      <FontAwesome name="credit-card" size={48} color={colors.gray[400]} />
      <Text
        style={{
          fontSize: 16,
          color: colors.gray[500],
          marginTop: spacing[4],
          textAlign: "center",
        }}
      >
        {hasFilters ? "No payments found" : "No payments recorded yet"}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.gray[400],
          marginTop: spacing[2],
          textAlign: "center",
        }}
      >
        {hasFilters
          ? "Try adjusting your search criteria"
          : "Start by recording your first payment"}
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: hasFilters ? colors.gray[200] : colors.primary[500],
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[3],
          borderRadius: 8,
          marginTop: spacing[4],
        }}
        onPress={hasFilters ? onClearFilters : onCreatePayment}
      >
        <Text
          style={{
            color: hasFilters ? colors.gray[700] : colors.white,
            fontWeight: "600",
          }}
        >
          {hasFilters ? "Clear Filters" : "Record First Payment"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
