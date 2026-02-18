import React from "react";
import { View, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { InventoryItem } from "@/types/inventory";
import { StandardHeader } from "@/components/layout";

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
    if (isOutOfStock) return "#ef4444";
    if (isLowStock) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <StandardHeader
      title={item.name}
      subtitle={`SKU: ${item.hsn || "N/A"} • ${item.quantity} in stock`}
      onBack={() => router.back()}
      rightElement={
        <View style={{ flexDirection: "row", columnGap: 8 }}>
          <TouchableOpacity
            onPress={onViewLogs}
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: "#f3f4f6",
            }}
          >
            <FontAwesome name="history" size={16} color="#4b5563" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: "#dbeafe",
            }}
          >
            <FontAwesome name="edit" size={16} color="#2563eb" />
          </TouchableOpacity>
        </View>
      }
    />
  );
};
