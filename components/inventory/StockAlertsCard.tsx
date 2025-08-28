import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card, Badge } from "@/components/DesignSystem";
import { StockAlert } from "@/types/inventory";
import { colors, spacing } from "@/components/DesignSystem";

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
          color: colors.error[500],
          icon: "exclamation-triangle",
          label: "Critical",
        };
      case "out_of_stock":
        return {
          color: colors.error[600],
          icon: "times-circle",
          label: "Out of Stock",
        };
      default:
        return {
          color: colors.warning[500],
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
          Stock Status
        </Text>

        {alerts.length > 0 && (
          <TouchableOpacity onPress={onViewAlerts}>
            <Text
              style={{
                fontSize: 14,
                color: colors.primary[600],
                fontWeight: "500",
              }}
            >
              View All ({alerts.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Current Status */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: spacing[3],
          backgroundColor: colors.gray[50],
          borderRadius: 8,
          marginBottom: spacing[3],
        }}
      >
        <FontAwesome
          name={statusConfig.icon as any}
          size={20}
          color={statusConfig.color}
          style={{ marginRight: spacing[3] }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.gray[900],
            }}
          >
            {currentStatus === "normal" ? "In Stock" : statusConfig.label}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.gray[600],
              marginTop: spacing[1],
            }}
          >
            Current quantity: {currentQuantity}
          </Text>
        </View>
        <Badge
          label={currentStatus === "normal" ? "Good" : "Alert"}
          variant={
            currentStatus === "normal"
              ? "success"
              : currentStatus === "low"
                ? "warning"
                : "error"
          }
        />
      </View>

      {/* Recent Alerts */}
      {alerts.slice(0, 3).map((alert) => {
        const alertConfig = getSeverityConfig(alert.severity);
        return (
          <View
            key={alert.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: spacing[2],
              backgroundColor: colors.gray[50],
              borderRadius: 6,
              marginBottom: spacing[2],
            }}
          >
            <FontAwesome
              name={alertConfig.icon as any}
              size={16}
              color={alertConfig.color}
              style={{ marginRight: spacing[2] }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[900],
                }}
              >
                {alert.message}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[500],
                  marginTop: 2,
                }}
              >
                {new Date(alert.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        );
      })}

      {alerts.length === 0 && (
        <View
          style={{
            padding: spacing[3],
            backgroundColor: colors.success[50],
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <FontAwesome
            name="check-circle"
            size={20}
            color={colors.success[500]}
          />
          <Text
            style={{
              fontSize: 14,
              color: colors.success[700],
              marginTop: spacing[2],
              textAlign: "center",
            }}
          >
            No active stock alerts. Inventory levels are good.
          </Text>
        </View>
      )}
    </Card>
  );
};
