import { Text, TouchableOpacity } from "react-native";
import { Badge, Card, colors, spacing } from "../DesignSystem";
import { View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { OrderWithCustomer } from "@/types/orders";
import { memo } from "react";
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

  return (
    <TouchableOpacity onPress={() => onViewOrder(order.id)}>
      <Card variant="elevated" padding={4}>
        <View style={{ gap: spacing[3] }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
                numberOfLines={1}
              >
                {order.order_number}
              </Text>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                {new Date(order.order_date).toLocaleDateString()}
              </Text>
            </View>
            <Badge
              label={order.order_status}
              variant={getStatusVariant(order.order_status)}
              size="sm"
            />
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.gray[400]}
              style={{ marginLeft: spacing[2] }}
            />
          </View>

          {/* Customer Info */}
          <TouchableOpacity
            onPress={() => onViewCustomer(order.customer_id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
              padding: spacing[2],
              backgroundColor: colors.gray[50],
              borderRadius: 6,
            }}
          >
            <FontAwesome name="user" size={14} color={colors.primary[500]} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
                numberOfLines={1}
              >
                {order.customers.name}
              </Text>
              {order.customers.company_name && (
                <Text
                  style={{ fontSize: 12, color: colors.gray[600] }}
                  numberOfLines={1}
                >
                  {order.customers.company_name}
                </Text>
              )}
            </View>
            <FontAwesome
              name="external-link"
              size={10}
              color={colors.gray[400]}
            />
          </TouchableOpacity>

          {/* Amount */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
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
      </Card>
    </TouchableOpacity>
  );
};

export const OrderCard = memo(OrderCardComponent);
