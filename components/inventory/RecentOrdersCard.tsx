import React from "react";
import { TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { OrderItemWithOrder } from "@/types/inventory";

interface RecentOrdersCardProps {
  orders: OrderItemWithOrder[];
  onViewAllOrders: () => void;
}

export const RecentOrdersCard: React.FC<RecentOrdersCardProps> = ({
  orders,
  onViewAllOrders,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (orders.length === 0) {
    return (
      <Box className="bg-background-0 rounded-xl p-6 shadow-sm border border-outline-200">
        <Text className="text-lg font-semibold text-typography-900 mb-4">
          Recent Orders
        </Text>
        <VStack className="p-4 bg-background-100 rounded-lg items-center gap-2">
          <FontAwesome
            name="shopping-cart"
            size={24}
            color="rgb(var(--color-typography-400))"
          />
          <Text className="text-sm text-typography-600 text-center">
            No orders found for this item
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box className="bg-background-0 rounded-xl p-6 shadow-sm border border-outline-200">
      <HStack className="justify-between items-center mb-4">
        <Text className="text-lg font-semibold text-typography-900">
          Recent Orders ({orders.length})
        </Text>
        <TouchableOpacity onPress={onViewAllOrders}>
          <Text className="text-sm text-primary-600 font-medium">View All</Text>
        </TouchableOpacity>
      </HStack>

      <ScrollView>
        {orders.slice(0, 5).map((orderItem) => (
          <TouchableOpacity
            key={orderItem.id}
            onPress={() => router.push(`/orders/${orderItem.order_id}` as any)}
            className="flex-row items-center justify-between p-3 bg-background-50 rounded-lg mb-2"
          >
            <VStack className="flex-1 gap-1">
              <Text className="text-sm font-semibold text-typography-900">
                Order #{orderItem.orders.order_number}
              </Text>
              <Text className="text-xs text-typography-600">
                {orderItem.orders.customers.name}
              </Text>
              <Text className="text-xs text-typography-500">
                {formatDate(orderItem.orders.order_date)}
              </Text>
            </VStack>

            <VStack className="items-end gap-1">
              <Text className="text-sm font-semibold text-typography-900">
                {orderItem.quantity} units
              </Text>
              <Text className="text-sm text-primary-600 font-semibold">
                ₹{orderItem.total_price.toLocaleString()}
              </Text>
              <Badge
                className={`${
                  orderItem.orders.order_status === "paid"
                    ? "bg-success-100 border-success-200"
                    : "bg-warning-100 border-warning-200"
                }`}
              >
                <BadgeText
                  className={`${
                    orderItem.orders.order_status === "paid"
                      ? "text-success-800"
                      : "text-warning-800"
                  }`}
                >
                  {orderItem.orders.order_status}
                </BadgeText>
              </Badge>
            </VStack>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Box>
  );
};
