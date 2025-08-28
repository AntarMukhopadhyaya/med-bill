import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Text,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, SafeScreen } from "@/components/DesignSystem";
import {
  InventoryWithRelations,
  InventoryMetrics,
  StockAlert,
} from "@/types/inventory";

import { colors, spacing } from "@/components/DesignSystem";
import { InventoryMetricsCard } from "@/components/inventory/InventoryMetricsCard";
import { FrequentCustomersCard } from "@/components/inventory/FrequentCutomersCard";
import { InventoryModal } from "@/components/inventory/InventoryModal";
import { StockAlertsCard } from "@/components/inventory/StockAlertsCard";
import { RecentOrdersCard } from "@/components/inventory/RecentOrdersCard";
import { InventoryDetailHeader } from "@/components/inventory/InventoryDetailHeader";

export default function InventoryDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);

  // Fetch inventory item with relations
  const {
    data: inventoryItem,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["inventory-detail", id],
    queryFn: async (): Promise<InventoryWithRelations | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("inventory")
        .select(
          `
          *,
          order_items:order_items(*, orders(*, customers(*))),
          low_stock_alerts(*),
          inventory_logs(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as InventoryWithRelations;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  // Calculate metrics
  const metrics = useMemo((): InventoryMetrics => {
    if (!inventoryItem) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageOrderQuantity: 0,
        lastOrderDate: null,
        frequentCustomers: [],
        stockHistory: [],
      };
    }

    const orderItems = inventoryItem.order_items || [];
    const totalSales = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = orderItems.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    const averageOrderQuantity =
      orderItems.length > 0 ? totalSales / orderItems.length : 0;

    // Get frequent customers
    const customerMap = new Map<
      string,
      { customer: any; orderCount: number; totalSpent: number }
    >();
    orderItems.forEach((item) => {
      const customerId = item.orders.customers.id;
      const existing = customerMap.get(customerId);
      if (existing) {
        customerMap.set(customerId, {
          ...existing,
          orderCount: existing.orderCount + 1,
          totalSpent: existing.totalSpent + item.total_price,
        });
      } else {
        customerMap.set(customerId, {
          customer: item.orders.customers,
          orderCount: 1,
          totalSpent: item.total_price,
        });
      }
    });

    const frequentCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    // Get last order date
    const lastOrderDate =
      orderItems.length > 0
        ? orderItems.reduce(
            (latest, item) =>
              new Date(item.orders.order_date) > new Date(latest)
                ? item.orders.order_date
                : latest,
            orderItems[0].orders.order_date
          )
        : null;

    // Get stock history from logs
    const stockHistory = (inventoryItem.inventory_logs || [])
      .filter(
        (log) =>
          log.change_type === "restock" || log.change_type === "adjustment"
      )
      .map((log) => ({
        date: log.created_at,
        quantity: log.quantity_changed,
      }))
      .slice(-10); // Last 10 changes

    return {
      totalSales,
      totalRevenue,
      averageOrderQuantity,
      lastOrderDate,
      frequentCustomers,
      stockHistory,
    };
  }, [inventoryItem]);

  // Prepare stock alerts
  const stockAlerts = useMemo((): StockAlert[] => {
    if (!inventoryItem) return [];

    const alerts: StockAlert[] = [];

    // Current stock status alert
    if (inventoryItem.quantity === 0) {
      alerts.push({
        id: "current-out-of-stock",
        message: "Item is out of stock",
        severity: "out_of_stock",
        createdAt: new Date().toISOString(),
      });
    } else if (inventoryItem.quantity < 5) {
      alerts.push({
        id: "current-critical",
        message: `Critical stock level: Only ${inventoryItem.quantity} units remaining`,
        severity: "critical",
        createdAt: new Date().toISOString(),
      });
    } else if (inventoryItem.quantity < 10) {
      alerts.push({
        id: "current-low",
        message: `Low stock level: ${inventoryItem.quantity} units remaining`,
        severity: "low",
        createdAt: new Date().toISOString(),
      });
    }

    // Add historical alerts
    (inventoryItem.low_stock_alerts || []).forEach((alert) => {
      alerts.push({
        id: alert.id,
        message: "Low stock level",
        severity: "low",
        createdAt: alert.created_at,
      });
    });

    return alerts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [inventoryItem]);

  // Update mutation
  const updateItemMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { data, error } = await supabase
        .from("inventory")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsEditModalVisible(false);
      Alert.alert("Success", "Item updated successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to update item");
    },
  });

  const handleEdit = useCallback(() => {
    setIsEditModalVisible(true);
  }, []);

  const handleViewLogs = useCallback(() => {
    setIsLogsModalVisible(true);
  }, []);

  const handleViewAllOrders = useCallback(() => {
    router.push({
      pathname: "/(tabs)/orders",
      params: { inventoryId: id },
    } as any);
  }, [id]);

  const handleSaveItem = useCallback(
    (itemData: any) => {
      if (id) {
        updateItemMutation.mutate(itemData);
      }
    },
    [id, updateItemMutation]
  );

  if (isLoading) {
    return (
      <SafeScreen>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeScreen>
    );
  }

  if (!inventoryItem) {
    return (
      <SafeScreen>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.gray[600] }}>Item not found</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <InventoryDetailHeader
        item={inventoryItem}
        onEdit={handleEdit}
        onViewLogs={handleViewLogs}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], gap: spacing[6] }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Stock Status & Alerts */}
        <StockAlertsCard
          alerts={stockAlerts}
          currentQuantity={inventoryItem.quantity}
          onViewAlerts={() => setIsLogsModalVisible(true)}
        />

        {/* Sales Metrics */}
        <InventoryMetricsCard metrics={metrics} />

        {/* Recent Orders */}
        <RecentOrdersCard
          orders={inventoryItem.order_items || []}
          onViewAllOrders={handleViewAllOrders}
        />

        {/* Frequent Customers */}
        <FrequentCustomersCard customers={metrics.frequentCustomers} />

        {/* Item Details Card */}
        <Card variant="elevated" padding={6}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Item Details
          </Text>

          <View style={{ gap: spacing[3] }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: spacing[3],
                backgroundColor: colors.gray[50],
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                HSN Code
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {inventoryItem.hsn || "N/A"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: spacing[3],
                backgroundColor: colors.gray[50],
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                GST Rate
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {inventoryItem.gst}%
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: spacing[3],
                backgroundColor: colors.gray[50],
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                Price
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                ₹{inventoryItem.price.toLocaleString()}
              </Text>
            </View>

            {inventoryItem.description && (
              <View
                style={{
                  padding: spacing[3],
                  backgroundColor: colors.gray[50],
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.gray[600],
                    marginBottom: spacing[2],
                  }}
                >
                  Description
                </Text>
                <Text style={{ fontSize: 14, color: colors.gray[900] }}>
                  {inventoryItem.description}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>

      {/* Edit Modal */}
      <InventoryModal
        visible={isEditModalVisible}
        item={inventoryItem}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveItem}
        isLoading={updateItemMutation.isPending}
      />

      {/* Logs Modal (to be implemented) */}
      {/* You can create a similar modal component for viewing inventory logs */}
    </SafeScreen>
  );
}
