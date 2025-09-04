import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { OrderWithRelations } from "@/types/orders";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Badge, BadgeText } from "@/components/ui/badge";

interface OrderStatusCardProps {
  order: OrderWithRelations;
}

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({ order }) => {
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

  return (
    <Box className="bg-background-0 border border-outline-200 rounded-xl p-5 shadow-sm">
      <HStack className="items-center justify-between mb-4">
        <Text className="text-base font-semibold text-typography-900">
          Order Status
        </Text>
        <Badge variant={getStatusVariant(order.order_status)}>
          <BadgeText className="capitalize">{order.order_status}</BadgeText>
        </Badge>
      </HStack>
      <VStack className="gap-4">
        <HStack className="items-center gap-3">
          <FontAwesome
            name="calendar"
            size={16}
            color="rgb(var(--color-typography-500))"
          />
          <VStack className="flex-1">
            <Text className="text-[11px] text-typography-500">Order Date</Text>
            <Text className="text-sm font-semibold text-typography-900">
              {new Date(order.order_date).toLocaleDateString()}
            </Text>
          </VStack>
        </HStack>
        <HStack className="items-center gap-3">
          <FontAwesome
            name="money"
            size={16}
            color="rgb(var(--color-typography-500))"
          />
          <VStack className="flex-1">
            <Text className="text-[11px] text-typography-500">
              Total Amount
            </Text>
            <Text className="text-lg font-bold text-primary-600">
              ₹{order.total_amount.toLocaleString()}
            </Text>
          </VStack>
        </HStack>
        {order.notes ? (
          <HStack className="items-start gap-3">
            <FontAwesome
              name="sticky-note"
              size={16}
              color="rgb(var(--color-typography-500))"
              style={{ marginTop: 2 }}
            />
            <VStack className="flex-1">
              <Text className="text-[11px] text-typography-500">
                Order Notes
              </Text>
              <Text className="text-sm text-typography-900 leading-5">
                {order.notes}
              </Text>
            </VStack>
          </HStack>
        ) : null}
      </VStack>
    </Box>
  );
};
