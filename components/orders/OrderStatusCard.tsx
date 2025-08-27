import React from "react";
import { View, Text } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card, Badge } from "@/components/DesignSystem";
import { OrderWithRelations } from "@/types/orders";
import { colors, spacing } from "@/components/DesignSystem";

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
    <Card variant="elevated" padding={6}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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
          Order Status
        </Text>
        <Badge
          label={order.order_status}
          variant={getStatusVariant(order.order_status)}
        />
      </View>

      <View style={{ gap: spacing[3] }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          <FontAwesome name="calendar" size={16} color={colors.gray[500]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.gray[600] }}>
              Order Date
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.gray[900],
              }}
            >
              {new Date(order.order_date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          <FontAwesome name="money" size={16} color={colors.gray[500]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.gray[600] }}>
              Total Amount
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.primary[600],
              }}
            >
              ₹{order.total_amount.toLocaleString()}
            </Text>
          </View>
        </View>

        {order.order_notes && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: spacing[3],
            }}
          >
            <FontAwesome
              name="sticky-note"
              size={16}
              color={colors.gray[500]}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                Order Notes
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[900],
                  lineHeight: 20,
                }}
              >
                {order.order_notes}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
};
