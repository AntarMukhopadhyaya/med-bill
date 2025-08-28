import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card, Badge } from "@/components/DesignSystem";
import { OrderItemWithOrder } from "@/types/inventory";
import { colors, spacing } from "@/components/DesignSystem";

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
      <Card variant="elevated" padding={6}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.gray[900],
            marginBottom: spacing[4],
          }}
        >
          Recent Orders
        </Text>
        <View
          style={{
            padding: spacing[4],
            backgroundColor: colors.gray[50],
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <FontAwesome
            name="shopping-cart"
            size={24}
            color={colors.gray[400]}
          />
          <Text
            style={{
              fontSize: 14,
              color: colors.gray[600],
              marginTop: spacing[2],
              textAlign: "center",
            }}
          >
            No orders found for this item
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding={6}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing[4],
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.gray[900],
          }}
        >
          Recent Orders ({orders.length})
        </Text>
        <TouchableOpacity onPress={onViewAllOrders}>
          <Text
            style={{
              fontSize: 14,
              color: colors.primary[600],
              fontWeight: "500",
            }}
          >
            View All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {orders.slice(0, 5).map((orderItem) => (
          <TouchableOpacity
            key={orderItem.id}
            onPress={() => router.push(`/orders/${orderItem.order_id}` as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: spacing[3],
              backgroundColor: colors.gray[50],
              borderRadius: 8,
              marginBottom: spacing[2],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                Order #{orderItem.orders.order_number}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[600],
                  marginTop: 2,
                }}
              >
                {orderItem.orders.customers.name}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[500],
                  marginTop: 2,
                }}
              >
                {formatDate(orderItem.orders.order_date)}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {orderItem.quantity} units
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.primary[600],
                  fontWeight: "600",
                }}
              >
                ₹{orderItem.total_price.toLocaleString()}
              </Text>
              <Badge
                label={orderItem.orders.order_status}
                variant={
                  orderItem.orders.order_status === "delivered"
                    ? "success"
                    : "warning"
                }
                size="sm"
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  );
};
