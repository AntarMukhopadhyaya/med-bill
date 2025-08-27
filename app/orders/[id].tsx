import React, { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Alert, Linking } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SafeScreen, EmptyState, colors } from "@/components/DesignSystem";
import { MenuItem, OrderWithRelations } from "@/types/orders";
import { OrderHeader } from "@/components/orders/OrderHeader";
import { OrderStatusCard } from "@/components/orders/OrderStatusCard";
import { CustomerInfoCard } from "@/components/customers/CustomerInfoCard";
import { OrderItemsList } from "@/components/orders/OrderItemsList";
import { QuickActionsCard } from "@/components/orders/QuickActionsCard";
import { DropdownMenu } from "@/components/DropdownMenu";
import { spacing } from "@/components/DesignSystem";

export default function OrderDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);

  // Fetch order with related data
  const {
    data: order,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["order-details", id],
    queryFn: async (): Promise<OrderWithRelations | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          customers(*),
          order_items(*, inventory(*))
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as OrderWithRelations;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No order ID");
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      Alert.alert("Success", "Order deleted successfully");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to delete order");
    },
  });

  // Memoized handlers
  const handleEdit = useCallback(() => {
    router.push(`/orders/${id}/edit` as any);
  }, [id]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Order",
      "Are you sure you want to delete this order? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteOrderMutation.mutate(),
        },
      ]
    );
  }, [deleteOrderMutation]);

  const handleViewCustomer = useCallback(() => {
    if (order?.customer_id) {
      router.push(`/customers/${order.customer_id}` as any);
    }
  }, [order?.customer_id]);

  const handleCreateInvoice = useCallback(() => {
    router.push({
      pathname: "/invoices/create",
      params: { orderId: id },
    } as any);
  }, [id]);

  const toggleDropdownMenu = useCallback(() => {
    setShowDropdownMenu((prev) => !prev);
  }, []);

  const closeDropdownMenu = useCallback(() => {
    setShowDropdownMenu(false);
  }, []);

  // Memoized menu items
  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        icon: "edit",
        label: "Edit Order",
        onPress: handleEdit,
      },
      {
        icon: "trash",
        label: "Delete Order",
        onPress: handleDelete,
        color: colors.error[600],
      },
    ],
    [handleEdit, handleDelete]
  );

  if (isLoading) {
    return (
      <SafeScreen>
        <OrderHeader
          order={{ order_number: "Loading..." } as OrderWithRelations}
          onBack={() => router.back()}
          onMenuPress={toggleDropdownMenu}
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Order"
            description="Fetching order details..."
          />
        </View>
      </SafeScreen>
    );
  }

  if (!order) {
    return (
      <SafeScreen>
        <OrderHeader
          order={{ order_number: "Not Found" } as OrderWithRelations}
          onBack={() => router.back()}
          onMenuPress={toggleDropdownMenu}
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="shopping-cart"
            title="Order Not Found"
            description="The order you're looking for doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <OrderHeader
        order={order}
        onBack={() => router.back()}
        onMenuPress={toggleDropdownMenu}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], gap: spacing[6] }}
      >
        <OrderStatusCard order={order} />
        <CustomerInfoCard
          customer={order.customers}
          onViewCustomer={handleViewCustomer}
          onCall={() => {
            if (order.customers.phone) {
              Linking.openURL(`tel:${order.customers.phone}`);
            }
          }}
          onEmail={() => {
            if (order.customers.email) {
              Linking.openURL(`mailto:${order.customers.email}`);
            }
          }}
        />
        <OrderItemsList order={order} />
        <QuickActionsCard
          onCreateInvoice={handleCreateInvoice}
          onEditOrder={handleEdit}
          onViewCustomer={handleViewCustomer}
        />
      </ScrollView>

      <DropdownMenu
        visible={showDropdownMenu}
        onClose={closeDropdownMenu}
        menuItems={menuItems}
      />
    </SafeScreen>
  );
}
