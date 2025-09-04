import React from "react";
import { TouchableOpacity } from "react-native";
import { OrderWithRelations } from "@/types/orders";
import { FontAwesome } from "@expo/vector-icons";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";

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
    <StandardHeader
      title={truncatedOrderNumber}
      subtitle={`Order #${order.order_number}`}
      showBackButton
      onBack={onBack}
      rightElement={
        <TouchableOpacity
          onPress={onMenuPress}
          className="p-2 rounded-md bg-background-100"
        >
          <FontAwesome
            name="ellipsis-v"
            size={16}
            color="rgb(var(--color-typography-500))"
          />
        </TouchableOpacity>
      }
    />
  );
};
