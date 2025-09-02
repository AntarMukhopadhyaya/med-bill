import React from "react";
import { View, Text } from "react-native";
import { Card, SectionHeader } from "@/components/DesignSystem";
import { OrderWithRelations } from "@/types/orders";
import { colors, spacing } from "@/components/DesignSystem";

interface OrderItemsListProps {
  order: OrderWithRelations;
}

export const OrderItemsList: React.FC<OrderItemsListProps> = ({ order }) => {
  return (
    <Card variant="elevated" className="p-6">
      <SectionHeader
        title="Order Items"
        subtitle={`${order.order_items.length} items`}
      />

      <View style={{ gap: spacing[3] }}>
        {order.order_items.map((item, index) => (
          <View
            key={`${item.id}-${index}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: spacing[3],
              backgroundColor: colors.gray[50],
              borderRadius: 8,
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
                {item.inventory.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                {item.inventory.hsn}
              </Text>
              <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                Qty: {item.quantity} × ₹{item.unit_price.toLocaleString()}
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
                ₹{item.total_price.toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};
