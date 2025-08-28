import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Header } from "@/components/DesignSystem";
import { InventoryItem } from "@/types/inventory";
import { colors, spacing } from "@/components/DesignSystem";

interface InventoryDetailHeaderProps {
  item: InventoryItem;
  onEdit: () => void;
  onViewLogs: () => void;
}

export const InventoryDetailHeader: React.FC<InventoryDetailHeaderProps> = ({
  item,
  onEdit,
  onViewLogs,
}) => {
  const isLowStock = item.quantity < 10;
  const isOutOfStock = item.quantity === 0;

  const getStockStatusColor = () => {
    if (isOutOfStock) return colors.error[500];
    if (isLowStock) return colors.warning[500];
    return colors.success[500];
  };

  return (
    <Header
      title={item.name}
      subtitle={`SKU: ${item.hsn || "N/A"} • ${item.quantity} in stock`}
      onBack={() => router.back()}
      rightElement={
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <TouchableOpacity
            onPress={onViewLogs}
            style={{
              padding: spacing[2],
              borderRadius: 6,
              backgroundColor: colors.gray[100],
            }}
          >
            <FontAwesome name="history" size={16} color={colors.gray[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              padding: spacing[2],
              borderRadius: 6,
              backgroundColor: colors.primary[100],
            }}
          >
            <FontAwesome name="edit" size={16} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
      }
    />
  );
};
