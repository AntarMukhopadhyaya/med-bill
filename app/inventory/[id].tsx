import React, { useState, useCallback, useMemo } from "react";
import { View, ActivityIndicator, RefreshControl } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Card } from "@/components/ui/card";
import { Badge, BadgeText } from "@/components/ui/badge";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { useToast } from "@/lib/toast";
import {
  InventoryWithRelations,
  InventoryMetrics,
  StockAlert,
} from "@/types/inventory";

import { InventoryMetricsCard } from "@/components/inventory/InventoryMetricsCard";
import { FrequentCustomersCard } from "@/components/inventory/FrequentCutomersCard";
import { InventoryModal } from "@/components/inventory/InventoryModal"; // TODO: migrate internal DS usage
import { StockAlertsCard } from "@/components/inventory/StockAlertsCard"; // TODO: migrate this card
import { RecentOrdersCard } from "@/components/inventory/RecentOrdersCard";
// InventoryDetailHeader still legacy; will replace inline here instead of using it
// import { InventoryDetailHeader } from "@/components/inventory/InventoryDetailHeader";

// Temporary color class helpers replacing old severity color logic
const quantityStatusClasses = (q: number) => {
  if (q === 0) return "bg-error-100 border-error-200 text-error-700";
  if (q < 5) return "bg-error-100 border-error-200 text-error-700";
  if (q < 10) return "bg-warning-100 border-warning-200 text-warning-700";
  return "bg-success-100 border-success-200 text-success-700";
};

export default function InventoryDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
  const toast = useToast();

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
        // @ts-ignore Supabase type mismatch for update payload
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
      toast.showToast("success", "Updated", "Item updated successfully");
    },
    onError: (error: any) => {
      toast.showToast(
        "error",
        "Update Failed",
        error?.message || "Failed to update item"
      );
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
      <StandardPage>
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator />
          <Text className="mt-4 text-typography-600">Loading item...</Text>
        </View>
      </StandardPage>
    );
  }

  if (!inventoryItem) {
    return (
      <StandardPage>
        <StandardHeader title="Inventory Item" showBackButton />
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-typography-600">Item not found</Text>
        </View>
      </StandardPage>
    );
  }

  return (
    <StandardPage>
      <StandardHeader
        title={inventoryItem.name}
        subtitle={`SKU: ${inventoryItem.hsn || "N/A"} • ${
          inventoryItem.quantity
        } in stock`}
        showBackButton
        rightElement={
          <HStack className="gap-2">
            <Box
              className="bg-background-100 rounded-md p-2"
              onTouchEnd={handleViewLogs}
            >
              <Text className="text-xs font-medium text-typography-600">
                Logs
              </Text>
            </Box>
            <Box
              className="bg-primary-100 rounded-md p-2"
              onTouchEnd={handleEdit}
            >
              <Text className="text-xs font-medium text-primary-700">Edit</Text>
            </Box>
          </HStack>
        }
      />

      <VStack space="lg" className="pb-8">
        <VStack className="gap-6">
          <StockAlertsCard
            alerts={stockAlerts}
            currentQuantity={inventoryItem.quantity}
            onViewAlerts={() => setIsLogsModalVisible(true)}
          />

          <InventoryMetricsCard metrics={metrics} />

          <RecentOrdersCard
            orders={inventoryItem.order_items || []}
            onViewAllOrders={handleViewAllOrders}
          />

          <FrequentCustomersCard customers={metrics.frequentCustomers as any} />

          <Card className="p-6">
            <Text className="text-lg font-semibold text-typography-900 mb-4">
              Item Details
            </Text>
            <VStack className="gap-3">
              <HStack className="items-center justify-between p-3 bg-background-100 rounded-lg">
                <Text className="text-sm text-typography-600">HSN Code</Text>
                <Text className="text-sm font-semibold text-typography-900">
                  {inventoryItem.hsn || "N/A"}
                </Text>
              </HStack>
              <HStack className="items-center justify-between p-3 bg-background-100 rounded-lg">
                <Text className="text-sm text-typography-600">GST Rate</Text>
                <Text className="text-sm font-semibold text-typography-900">
                  {inventoryItem.gst}%
                </Text>
              </HStack>
              <HStack className="items-center justify-between p-3 bg-background-100 rounded-lg">
                <Text className="text-sm text-typography-600">Price</Text>
                <Text className="text-sm font-semibold text-typography-900">
                  ₹{inventoryItem.price.toLocaleString()}
                </Text>
              </HStack>
              {inventoryItem.description && (
                <VStack className="p-3 bg-background-100 rounded-lg">
                  <Text className="text-sm text-typography-600 mb-1">
                    Description
                  </Text>
                  <Text className="text-sm text-typography-900">
                    {inventoryItem.description}
                  </Text>
                </VStack>
              )}
            </VStack>
          </Card>
        </VStack>
      </VStack>

      <InventoryModal
        visible={isEditModalVisible}
        item={inventoryItem}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveItem}
        isLoading={updateItemMutation.isPending}
      />
    </StandardPage>
  );
}
