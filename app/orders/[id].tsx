import React from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
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
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type Product = Database["public"]["Tables"]["inventory"]["Row"];

interface OrderWithRelations {
  id: string;
  created_at: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  order_status: string;
  total_amount: number;
  order_notes: string | null;
  customers: Customer;
  order_items: (OrderItem & { inventory: Product })[];
}

export default function OrderDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

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

  const handleEdit = () => {
    router.push(`/orders/${id}/edit` as any);
  };

  const handleDelete = () => {
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
  };

  const handleViewCustomer = () => {
    if (order?.customer_id) {
      router.push(`/customers/${order.customer_id}` as any);
    }
  };

  const handleCreateInvoice = () => {
    router.push({
      pathname: "/invoices/create",
      params: { orderId: id },
    } as any);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return colors.warning[500];
      case "processing":
        return colors.primary[500];
      case "shipped":
        return colors.info[500];
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

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header title="Order Details" onBack={() => router.back()} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Order"
            description="Fetching order details..."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header title="Order Not Found" onBack={() => router.back()} />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray[50] }}>
      <Header
        title={order.order_number}
        subtitle={`Order #${order.order_number}`}
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
        {/* Order Status Card */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
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
              Order Status
            </Text>
            <Badge
              label={order.order_status}
              variant={getStatusVariant(order.order_status)}
            />
          </View>

          <View style={{ gap: spacing[3] }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <FontAwesome name="calendar" size={16} color={colors.gray[500]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  Order Date
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.gray[900],
                  }}
                >
                  {new Date(order.order_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <FontAwesome name="money" size={16} color={colors.gray[500]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  Total Amount
                </Text>
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

            {order.order_notes && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: spacing[3],
                }}
              >
                <FontAwesome
                  name="sticky-note"
                  size={16}
                  color={colors.gray[500]}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                    Order Notes
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.gray[900],
                      lineHeight: 20,
                    }}
                  >
                    {order.order_notes}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Customer Information */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader
            title="Customer Information"
            rightElement={
              <Button
                title="View Details"
                onPress={handleViewCustomer}
                variant="ghost"
                size="sm"
                icon="external-link"
              />
            }
          />

          <TouchableOpacity
            onPress={handleViewCustomer}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
              padding: spacing[3],
              backgroundColor: colors.gray[50],
              borderRadius: 8,
            }}
          >
            <FontAwesome name="user" size={20} color={colors.primary[500]} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {order.customers.name}
              </Text>
              {order.customers.company_name && (
                <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                  {order.customers.company_name}
                </Text>
              )}
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                {order.customers.phone}
              </Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
        </Card>

        {/* Order Items */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader
            title="Order Items"
            subtitle={`${order.order_items.length} items`}
          />

          <View style={{ gap: spacing[3] }}>
            {order.order_items.map((item, index) => (
              <View
                key={index}
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
                    {item.inventory.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                    {item.inventory.hsn}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                    Qty: {item.quantity} × ₹{item.unit_price.toLocaleString()}
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
                    ₹{item.total_price.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Quick Actions */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader title="Quick Actions" />

          <View style={{ gap: spacing[3] }}>
            <Button
              title="Create Invoice"
              onPress={handleCreateInvoice}
              variant="primary"
              icon="file-text"
            />

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Edit Order"
                  onPress={handleEdit}
                  variant="outline"
                  icon="edit"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="View Customer"
                  onPress={handleViewCustomer}
                  variant="outline"
                  icon="user"
                />
              </View>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
