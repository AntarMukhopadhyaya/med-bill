import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/ui/card";
import { Badge, BadgeText } from "@/components/ui/badge";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Heading } from "@/components/ui/heading";
import { formatDate } from "@/lib/date";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { StockAlert } from "@/types/inventory";

interface StockAlertsCardProps {
  alerts: StockAlert[];
  currentQuantity: number;
  onViewAlerts: () => void;
}

export const StockAlertsCard: React.FC<StockAlertsCardProps> = ({
  alerts,
  currentQuantity,
  onViewAlerts,
}) => {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          color: "#ef4444",
          icon: "exclamation-triangle",
          label: "Critical",
        };
      case "out_of_stock":
        return {
          color: "#b91c1c",
          icon: "times-circle",
          label: "Out of Stock",
        };
      default:
        return {
          color: "#f59e0b",
          icon: "exclamation-circle",
          label: "Low Stock",
        };
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return "out_of_stock";
    if (quantity < 5) return "critical";
    if (quantity < 10) return "low";
    return "normal";
  };

  const currentStatus = getStockStatus(currentQuantity);
  const statusConfig = getSeverityConfig(currentStatus);

  return (
    <Card variant="elevated" className="p-4">
      <HStack className="items-center justify-between mb-4">
        <Heading size="md" className="font-semibold text-typography-900">
          Stock Status
        </Heading>
        {alerts.length > 0 && (
          <Pressable onPress={onViewAlerts} className="active:opacity-80">
            <Text className="text-sm font-medium text-primary-600">
              View All ({alerts.length})
            </Text>
          </Pressable>
        )}
      </HStack>

      {/* Current Status */}
      <HStack className="items-center bg-background-50 rounded-lg px-3 py-3 mb-3">
        <FontAwesome
          name={statusConfig.icon as any}
          size={20}
          color={statusConfig.color}
          style={{ marginRight: 12 }}
        />
        <VStack className="flex-1">
          <Text className="text-base font-semibold text-typography-900">
            {currentStatus === "normal" ? "In Stock" : statusConfig.label}
          </Text>
          <Text className="text-sm text-typography-600 mt-1">
            Current quantity: {currentQuantity}
          </Text>
        </VStack>
        <Badge
          variant={
            currentStatus === "normal"
              ? "success"
              : currentStatus === "low"
                ? "warning"
                : "error"
          }
        >
          <BadgeText>{currentStatus === "normal" ? "Good" : "Alert"}</BadgeText>
        </Badge>
      </HStack>

      {/* Recent Alerts */}
      {alerts.slice(0, 3).map((alert) => {
        const alertConfig = getSeverityConfig(alert.severity);
        return (
          <HStack
            key={alert.id}
            className="items-center bg-background-50 rounded-md px-2 py-2 mb-2"
          >
            <FontAwesome
              name={alertConfig.icon as any}
              size={16}
              color={alertConfig.color}
              style={{ marginRight: 8 }}
            />
            <VStack className="flex-1">
              <Text className="text-sm text-typography-900">
                {alert.message}
              </Text>
              <Text className="text-xs text-typography-500 mt-0.5">
                {formatDate(alert.createdAt)}
              </Text>
            </VStack>
          </HStack>
        );
      })}

      {alerts.length === 0 && (
        <VStack className="items-center bg-success-50 rounded-lg px-3 py-3">
          <FontAwesome name="check-circle" size={20} color="#22c55e" />
          <Text className="text-sm text-success-700 mt-2 text-center">
            No active stock alerts. Inventory levels are good.
          </Text>
        </VStack>
      )}
    </Card>
  );
};
