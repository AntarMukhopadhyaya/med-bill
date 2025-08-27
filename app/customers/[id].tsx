import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  Card,
  Button,
  Badge,
  SectionHeader,
  EmptyState,
  colors,
  spacing,
  SafeScreen,
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";
import { CustomerInfoCard } from "@/components/customers/CustomerInfoCard";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type Ledger = Database["public"]["Tables"]["ledgers"]["Row"];

interface CustomerWithRelations {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string;
  gstin: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  updated_at: string | null;
  company_name: string | null;
  country: string | null;
  orders: Order[];
  invoices: Invoice[];
  ledgers: Ledger[];
}

interface CustomerWithStats extends CustomerWithRelations {
  total_orders: number;
  total_revenue: number;
  pending_amount: number;
  ledger: Ledger | null;
}

export default function CustomerDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Fetch customer with related data
  const {
    data: customer,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["customer-details", id],
    queryFn: async (): Promise<CustomerWithStats | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("customers")
        .select(
          `
          *,
          orders(*),
          invoices(*),
          ledgers(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Type assertion for the joined data
      const customerWithRelations = data as unknown as CustomerWithRelations;

      // Calculate stats
      const totalOrders = customerWithRelations.orders?.length || 0;
      const totalRevenue =
        customerWithRelations.orders?.reduce(
          (sum: number, order: Order) => sum + order.total_amount,
          0
        ) || 0;
      const pendingAmount =
        customerWithRelations.invoices
          ?.filter((inv: Invoice) => inv.status !== "paid")
          .reduce((sum: number, inv: Invoice) => sum + inv.amount, 0) || 0;

      return {
        ...customerWithRelations,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        pending_amount: pendingAmount,
        ledger: customerWithRelations.ledgers?.[0] || null,
      };
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No customer ID");
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      Alert.alert("Success", "Customer deleted successfully");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to delete customer");
    },
  });

  const handleEdit = () => {
    router.push(`/customers/${id}/edit` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Customer",
      "Are you sure you want to delete this customer? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCustomerMutation.mutate(),
        },
      ]
    );
  };

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  const handleViewOrders = () => {
    router.push({
      pathname: "/(tabs)/orders",
      params: { customerId: id },
    } as any);
  };

  const handleViewInvoices = () => {
    router.push({
      pathname: "/(tabs)/invoices",
      params: { customerId: id },
    } as any);
  };

  const handleViewLedger = () => {
    router.push(`/ledger/${id}` as any);
  };

  const handleCreateOrder = () => {
    router.push({
      pathname: "/orders/create",
      params: { customerId: id },
    } as any);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header title="Customer Details" onBack={() => router.back()} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Customer"
            description="Fetching customer details..."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header title="Customer Not Found" onBack={() => router.back()} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="user-times"
            title="Customer Not Found"
            description="The customer you're looking for doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeScreen>
      <Header
        title={customer.name}
        subtitle={customer.company_name || "Individual Customer"}
        onBack={() => router.back()}
        rightElement={
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <Button
              title="Edit"
              onPress={handleEdit}
              variant="outline"
              size="sm"
              icon="edit"
            />
            <Button
              title="Delete"
              onPress={handleDelete}
              variant="danger"
              size="sm"
              icon="trash"
            />
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
      >
        <View className="mb-4">
          <CustomerInfoCard
            customer={customer}
            onCall={handleCall}
            onEmail={handleEmail}
          />
        </View>

        {/* Stats Cards */}
        <View
          style={{
            flexDirection: "row",
            gap: spacing[3],
            marginBottom: spacing[6],
            flexWrap: "wrap",
          }}
        >
          <View style={{ flex: 1, minWidth: 100 }}>
            <Card variant="elevated" padding={4}>
              <View style={{ alignItems: "center", gap: spacing[2] }}>
                <FontAwesome
                  name="shopping-cart"
                  size={20}
                  color={colors.primary[500]}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    textAlign: "center",
                  }}
                >
                  Total Orders
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.primary[600],
                  }}
                >
                  {customer.total_orders}
                </Text>
              </View>
            </Card>
          </View>

          <View style={{ flex: 1, minWidth: 100 }}>
            <Card variant="elevated" padding={4}>
              <View style={{ alignItems: "center", gap: spacing[2] }}>
                <FontAwesome
                  name="line-chart"
                  size={20}
                  color={colors.success[500]}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    textAlign: "center",
                  }}
                >
                  Total Revenue
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.success[600],
                  }}
                >
                  ₹{customer.total_revenue?.toLocaleString()}
                </Text>
              </View>
            </Card>
          </View>

          <View style={{ flex: 1, minWidth: 100 }}>
            <Card variant="elevated" padding={4}>
              <View style={{ alignItems: "center", gap: spacing[2] }}>
                <FontAwesome
                  name="exclamation-triangle"
                  size={20}
                  color={colors.warning[500]}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    textAlign: "center",
                  }}
                >
                  Pending Amount
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.warning[600],
                  }}
                >
                  ₹{customer.pending_amount?.toLocaleString()}
                </Text>
              </View>
            </Card>
          </View>
        </View>

        {/* Quick Actions */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader title="Quick Actions" />

          <View style={{ gap: spacing[3] }}>
            <Button
              title="Create New Order"
              onPress={handleCreateOrder}
              variant="primary"
              icon="plus-circle"
            />

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="View Orders"
                  onPress={handleViewOrders}
                  variant="outline"
                  icon="shopping-cart"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="View Invoices"
                  onPress={handleViewInvoices}
                  variant="outline"
                  icon="file-text"
                />
              </View>
            </View>

            <Button
              title="View Ledger"
              onPress={handleViewLedger}
              variant="outline"
              icon="book"
            />
          </View>
        </Card>

        {/* Recent Orders */}
        {customer.orders && customer.orders.length > 0 && (
          <Card
            variant="elevated"
            padding={6}
            style={{ marginBottom: spacing[6] }}
          >
            <SectionHeader
              title="Recent Orders"
              subtitle={`${customer.orders.length} orders`}
              rightElement={
                <Button
                  title="View All"
                  onPress={handleViewOrders}
                  variant="ghost"
                  size="sm"
                />
              }
            />

            <View style={{ gap: spacing[3] }}>
              {customer.orders.slice(0, 3).map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => router.push(`/orders/${order.id}` as any)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: spacing[3],
                    backgroundColor: colors.gray[50],
                    borderRadius: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.gray[900],
                      }}
                    >
                      {order.order_number}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                      {new Date(order.order_date).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.gray[900],
                      }}
                    >
                      ₹{order.total_amount.toLocaleString()}
                    </Text>
                    <Badge
                      label={order.order_status}
                      variant={
                        order.order_status === "delivered"
                          ? "success"
                          : "warning"
                      }
                      size="sm"
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeScreen>
  );
}
