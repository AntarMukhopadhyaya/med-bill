import React, { useState, useMemo, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  OrderWithCustomer,
  StatusOption,
  OrdersPageParams,
} from "@/types/orders";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderList } from "@/components/orders/OrderList";
import { VStack } from "@/components/ui/vstack";
import { StandardPage, StandardHeader } from "@/components/layout";
import { useToastHelpers } from "@/lib/toast";
import { Alert } from "react-native";
import { useInfiniteOrders } from "@/hooks/useInfiniteOrders";
import { useOrderDeleteMutation } from "@/hooks/useOrders";

export default function OrdersPage() {
  const { customerId } = useLocalSearchParams() as OrdersPageParams;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { showSuccess, showError } = useToastHelpers();

  // Status options with memoization
  const statusOptions = useMemo<StatusOption[]>(
    () => [
      { key: "all", label: "All Orders", icon: "list" },
      { key: "pending", label: "Pending", icon: "clock-o" },
      { key: "paid", label: "Paid", icon: "check-circle" },
    ],
    []
  );

  // Fetch orders with customer data
  const {
    data,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteOrders({
    searchQuery,
    statusFilter,
    customerId,
  });
  const orderDeleteMutation = useOrderDeleteMutation();

  // Memoized handlers
  const handleCreateOrder = useCallback(() => {
    router.push("/orders/create" as any);
  }, []);

  const handleViewOrder = useCallback((orderId: string) => {
    router.push(`/orders/${orderId}` as any);
  }, []);

  const handleViewCustomer = useCallback((customerId: string) => {
    router.push(`/customers/${customerId}` as any);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setShowFilters(false);
  }, []);
  const handleDeleteOrder = (orderId: string) => {
    Alert.alert("Delete Order", "Are you sure you want to delete this order?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          orderDeleteMutation.mutate(orderId, {
            onSuccess: () => {
              showSuccess("Order Deleted", "The order has been deleted");
            },
            onError: (error: any) => {
              showError("Error", error.message || "Failed to delete order");
            },
          }),
      },
    ]);
  };

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const orders = useMemo(
    () => (data?.pages.flat() ?? []) as OrderWithCustomer[],
    [data]
  );

  if (isLoading) {
    return (
      <StandardPage>
        <StandardHeader
          title="Orders"
          subtitle="0 orders"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search orders..."
          showAddButton={true}
          onAddPress={handleCreateOrder}
        />
        <VStack className="flex-1 items-center justify-center py-8" />
      </StandardPage>
    );
  }

  return (
    <StandardPage refreshing={isRefetching} onRefresh={refetch}>
      <StandardHeader
        title="Orders"
        subtitle={`${orders.length} orders`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search orders..."
        showAddButton={true}
        onAddPress={handleCreateOrder}
        showFiltersButton={true}
        onFiltersPress={toggleFilters}
      />

      {/* Filters */}
      {showFilters && (
        <VStack className="bg-white px-6 py-4 border-b border-gray-200">
          <OrderFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusOptions={statusOptions}
          />
        </VStack>
      )}

      <OrderList
        orders={orders}
        isRefetching={isRefetching}
        refetch={refetch}
        onViewOrder={handleViewOrder}
        onViewCustomer={handleViewCustomer}
        onDeleteOrder={handleDeleteOrder}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        isLoading={isLoading}
        onCreateOrder={handleCreateOrder}
        onClearFilters={handleClearFilters}
        onLoadMore={() => {
          if (hasNextPage) fetchNextPage();
        }}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </StandardPage>
  );
}
