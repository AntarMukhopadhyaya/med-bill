import { InventoryMetrics } from "@/types/inventory";
import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";

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
      color: "rgb(var(--color-primary-500))",
    },
    {
      icon: "money",
      label: "Total Revenue",
      value: `₹${metrics.totalRevenue.toLocaleString()}`,
      color: "rgb(var(--color-success-500))",
    },
    {
      icon: "cube",
      label: "Avg Order Qty",
      value: metrics.averageOrderQuantity.toFixed(1),
      color: "rgb(var(--color-info-500))",
    },
    {
      icon: "calendar",
      label: "Last Ordered",
      value: metrics.lastOrderDate
        ? new Date(metrics.lastOrderDate).toLocaleDateString()
        : "Never",
      color: "rgb(var(--color-typography-500))",
    },
  ];

  return (
    <Card className="p-6">
      <Text className="text-lg font-semibold text-typography-900 mb-4">
        Sales Metrics
      </Text>

      <HStack className="flex-wrap gap-3">
        {metricCards.map((metric, index) => (
          <VStack
            key={index}
            className="w-[48%] bg-background-100 p-3 rounded-lg items-center gap-2"
          >
            <FontAwesome
              name={metric.icon as any}
              size={20}
              color={metric.color}
            />
            <Text className="text-base font-bold text-typography-900 text-center">
              {metric.value}
            </Text>
            <Text className="text-xs text-typography-600 text-center">
              {metric.label}
            </Text>
          </VStack>
        ))}
      </HStack>
    </Card>
  );
};
