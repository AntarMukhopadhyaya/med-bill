import { InventoryMetrics } from "@/types/inventory";
import { Card, colors, spacing } from "../DesignSystem";
import { Text, View } from "react-native";
import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";

interface InventoryMetricsCardProps {
  metrics: InventoryMetrics;
}
export const InventoryMetricsCard: React.FC<InventoryMetricsCardProps> = ({
  metrics,
}) => {
  const metricCards = [
    {
      icon: "shopping-cart",
      label: "Total Sales",
      value: metrics.totalSales.toString(),
      color: colors.primary[500],
    },
    {
      icon: "money",
      label: "Total Revenue",
      value: `₹${metrics.totalRevenue.toLocaleString()}`,
      color: colors.success[500],
    },
    {
      icon: "cube",
      label: "Avg Order Qty",
      value: metrics.averageOrderQuantity.toFixed(1),
      color: colors.info[500],
    },
    {
      icon: "calendar",
      label: "Last Ordered",
      value: metrics.lastOrderDate
        ? new Date(metrics.lastOrderDate).toLocaleDateString()
        : "Never",
      color: colors.gray[500],
    },
  ];

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
        Sales Metrics
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing[3],
        }}
      >
        {metricCards.map((metric, index) => (
          <View
            key={index}
            style={{
              width: "48%",
              backgroundColor: colors.gray[50],
              padding: spacing[3],
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <FontAwesome
              name={metric.icon as any}
              size={20}
              color={metric.color}
              style={{ marginBottom: spacing[2] }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.gray[900],
                textAlign: "center",
              }}
            >
              {metric.value}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[600],
                textAlign: "center",
                marginTop: spacing[1],
              }}
            >
              {metric.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
