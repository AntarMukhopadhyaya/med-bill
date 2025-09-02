import React, { useState, useMemo, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  OrderWithCustomer,
  StatusOption,
  OrdersPageParams,
} from "@/types/orders";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderList } from "@/components/orders/OrderList";
import { VStack, EmptyState } from "@/components/DesignSystem";
import { StandardPage, StandardHeader } from "@/components/layout";

export default function OrdersPage() {
  const { customerId } = useLocalSearchParams() as OrdersPageParams;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Status options with memoization
  const statusOptions = useMemo<StatusOption[]>(
    () => [
      { key: "all", label: "All Orders", icon: "list" },
      { key: "pending", label: "Pending", icon: "clock-o" },
      { key: "processing", label: "Processing", icon: "cog" },
      { key: "shipped", label: "Shipped", icon: "truck" },
      { key: "delivered", label: "Delivered", icon: "check-circle" },
      { key: "cancelled", label: "Cancelled", icon: "times-circle" },
    ],
    []
  );

  // Fetch orders with customer data
  const {
    data: orders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["orders", searchQuery, statusFilter, customerId],
    queryFn: async (): Promise<OrderWithCustomer[]> => {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          customers(*)
        `
        )
        .order("created_at", { ascending: false });

      // Filter by customer if specified
      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      // Filter by status
      if (statusFilter !== "all") {
        query = query.eq("order_status", statusFilter);
      }

      // Search filter
      if (searchQuery.trim()) {
        query = query.or(`order_number.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as OrderWithCustomer[];
    },
    staleTime: 2 * 60 * 1000,
  });

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

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

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
        <VStack
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Orders"
            description="Fetching order data..."
          />
        </VStack>
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
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        isLoading={isLoading}
        onCreateOrder={handleCreateOrder}
        onClearFilters={handleClearFilters}
      />
    </StandardPage>
  );
}
