import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { OrderWithCustomer } from "@/types/orders";
import { BaseCard, BaseCardAction } from "@/components/shared/BaseCard";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";

interface OrderCardProps {
  order: OrderWithCustomer;
  onViewOrder: (orderId: string) => void;
  onViewCustomer: (customerId: string) => void;
}

const OrderCardComponent: React.FC<OrderCardProps> = ({
  order,
  onViewOrder,
  onViewCustomer,
}) => {
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "warning";
      case "processing":
        return "primary";
      case "shipped":
        return "primary";
      case "delivered":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "secondary";
    }
  };

  // Additional order-specific actions
  const additionalActions: BaseCardAction[] = [
    {
      icon: "user",
      colorClass: "text-primary-600",
      backgroundClass: "bg-primary-50",
      onPress: () => onViewCustomer(order.customer_id),
      label: "View Customer",
    },
  ];

  // Customer Info Section
  const infoSection = (
    <TouchableOpacity
      onPress={() => onViewCustomer(order.customer_id)}
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
          {order.customers.name}
        </Text>
        {order.customers.company_name && (
          <Text className="text-xs text-typography-600" numberOfLines={1}>
            {order.customers.company_name}
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

  // Amount Section
  const detailsSection = (
    <Text className="text-lg font-bold text-primary-600">
      ₹{order.total_amount.toLocaleString()}
    </Text>
  );

  return (
    <BaseCard
      title={order.order_number}
      subtitle={new Date(order.order_date).toLocaleDateString()}
      status={{
        label: order.order_status,
        variant: getStatusVariant(order.order_status),
      }}
      onPress={() => onViewOrder(order.id)}
      onEdit={() => {}} // Orders might not have edit - implement if needed
      onDelete={() => {}} // Orders might not have delete - implement if needed
      onViewDetails={() => onViewOrder(order.id)}
      additionalActions={additionalActions}
      infoSection={infoSection}
      detailsSection={detailsSection}
    />
  );
};

export const OrderCard = memo(OrderCardComponent);
