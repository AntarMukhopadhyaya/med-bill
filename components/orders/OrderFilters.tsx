import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatusOption } from "@/types/orders";
import { colors, spacing } from "@/components/DesignSystem";

interface OrderFiltersProps {
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  statusOptions: StatusOption[];
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  statusFilter,
  setStatusFilter,
  statusOptions,
}) => {
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "500",
          color: colors.gray[700],
          marginBottom: spacing[2],
        }}
      >
        Filter by Status
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {statusOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => setStatusFilter(option.key)}
            style={{
              marginRight: spacing[3],
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[2],
              borderRadius: 8,
              borderWidth: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor:
                statusFilter === option.key
                  ? colors.primary[500]
                  : colors.white,
              borderColor:
                statusFilter === option.key
                  ? colors.primary[500]
                  : colors.gray[300],
            }}
          >
            <FontAwesome
              name={option.icon}
              size={14}
              color={
                statusFilter === option.key ? colors.white : colors.gray[600]
              }
            />
            <Text
              style={{
                marginLeft: spacing[2],
                fontWeight: "500",
                color:
                  statusFilter === option.key ? colors.white : colors.gray[700],
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
