import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  Card,
  Button,
  SearchInput,
  EmptyState,
  Badge,
  FilterChip,
  SafeScreen,
  colors,
  spacing,
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface OrderWithCustomer extends Order {
  customers: Customer;
}

export default function OrdersPage() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const handleCreateOrder = () => {
    router.push("/orders/create" as any);
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/orders/${orderId}` as any);
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/customers/${customerId}` as any);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return colors.warning[500];
      case "processing":
        return colors.primary[500];
      case "shipped":
        return colors.primary[500];
      case "delivered":
        return colors.success[500];
      case "cancelled":
        return colors.error[500];
      default:
        return colors.gray[500];
    }
  };

  const getStatusVariant = (
    status: string
  ): "primary" | "success" | "warning" | "error" | "secondary" => {
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

  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const renderOrderCard = ({ item: order }: { item: OrderWithCustomer }) => (
    <TouchableOpacity
      onPress={() => handleViewOrder(order.id)}
      style={{ marginBottom: spacing[4] }}
    >
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
            onPress={() => handleViewCustomer(order.customer_id)}
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
              >
                {order.customers.name}
              </Text>
              {order.customers.company_name && (
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
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

          {/* Amount and Notes */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
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
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeScreen>
        <Header
          title="Orders"
          subtitle="Manage your orders"
          rightElement={
            <Button
              title="Add Order"
              onPress={handleCreateOrder}
              variant="primary"
              size="sm"
              icon="plus"
            />
          }
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Orders"
            description="Fetching order data..."
          />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <Header
        title="Orders"
        subtitle={customerId ? "Customer Orders" : `${orders.length} orders`}
        onBack={customerId ? () => router.back() : undefined}
        rightElement={
          <Button
            title="Add Order"
            onPress={handleCreateOrder}
            variant="primary"
            size="sm"
            icon="plus"
          />
        }
      />

      <View style={{ padding: spacing[6], paddingBottom: 0 }}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search orders by order number..."
        />

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing[4] }}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {statusOptions.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={statusFilter === option.value}
              onPress={() => setStatusFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      {orders.length === 0 && !isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="shopping-cart"
            title={
              searchQuery || statusFilter !== "all"
                ? "No orders found"
                : "No orders yet"
            }
            description={
              searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first order to get started"
            }
            actionLabel={
              searchQuery || statusFilter !== "all"
                ? "Clear Filters"
                : "Add Order"
            }
            onAction={() => {
              if (searchQuery || statusFilter !== "all") {
                setSearchQuery("");
                setStatusFilter("all");
              } else {
                handleCreateOrder();
              }
            }}
          />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing[6],
            paddingTop: spacing[4],
          }}
          refreshing={isRefetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
}
