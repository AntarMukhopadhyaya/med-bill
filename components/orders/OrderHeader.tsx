import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Header } from "@/components/DesignSystem";
import { OrderWithRelations } from "@/types/orders";
import { colors, spacing } from "@/components/DesignSystem";
import { FontAwesome } from "@expo/vector-icons";

interface OrderHeaderProps {
  order: OrderWithRelations;
  onBack: () => void;
  onMenuPress: () => void;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  onBack,
  onMenuPress,
}) => {
  const truncatedOrderNumber =
    order.order_number.length > 25
      ? `${order.order_number.slice(0, 25)}...`
      : order.order_number;

  return (
    <Header
      title={truncatedOrderNumber}
      subtitle={`Order #${order.order_number}`}
      onBack={onBack}
      rightElement={
        <TouchableOpacity
          onPress={onMenuPress}
          style={{
            padding: spacing[2],
            borderRadius: 6,
            backgroundColor: colors.gray[100],
          }}
        >
          <FontAwesome name="ellipsis-v" size={16} color={colors.gray[600]} />
        </TouchableOpacity>
      }
    />
  );
};
