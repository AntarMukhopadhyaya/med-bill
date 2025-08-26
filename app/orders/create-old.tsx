import React, { useState, useMemo } from "react";
import { View, ScrollView, Pressable, Text } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SafeScreen } from "@/components/DesignSystem";
import { FormInput, FormButton, FormSection, FormContainer, FormPicker } from "@/components/FormComponents";
import { orderSchema, validateForm } from "@/lib/validation";
import { useToastHelpers } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/components/DesignSystem";

type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Product = Database["public"]["Tables"]["inventory"]["Row"];

export default function CreateOrderPage() {
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<Partial<OrderInsert>>({
    order_number: `ORD-${Date.now()}`,
    customer_id: "",
    order_date: new Date().toISOString().split("T")[0],
    order_status: "pending",
    total_amount: 0,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerSearch, setCustomerSearch] = useState("");

  // Fetch customers for selection
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: async (): Promise<Customer[]> => {
      let query = supabase.from("customers").select("*").order("name");

      if (customerSearch.trim()) {
        query = query.or(
          `name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`
        );
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      Alert.alert("Success", "Order created successfully", [
        {
          text: "OK",
          onPress: () => router.replace(`/orders/${data.id}` as any),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to create order");
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = "Customer is required";
    }
    if (!formData.order_date) {
      newErrors.order_date = "Order date is required";
    }
    if (!formData.total_amount || formData.total_amount <= 0) {
      newErrors.total_amount = "Total amount must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    createOrderMutation.mutate(formData as any);
  };

  const updateFormData = (field: keyof OrderInsert, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <SafeScreen>
      <Header
        title="Create Order"
        subtitle="Add a new order"
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding={6}>
          <View style={{ gap: spacing[5] }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.gray[900],
                marginBottom: spacing[2],
              }}
            >
              Order Details
            </Text>

            <Input
              label="Order Number"
              value={formData.order_number || ""}
              onChangeText={(value) => updateFormData("order_number", value)}
              placeholder="Enter order number"
              error={errors.order_number}
            />

            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.gray[700],
                  marginBottom: spacing[2],
                }}
              >
                Customer *
              </Text>
              <SearchInput
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search customers..."
              />
              {customers.length > 0 && (
                <ScrollView
                  style={{
                    maxHeight: 150,
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    borderRadius: 8,
                    marginTop: spacing[2],
                  }}
                >
                  {customers.map((customer) => (
                    <Button
                      key={customer.id}
                      title={`${customer.name} ${customer.company_name ? `(${customer.company_name})` : ""}`}
                      variant={
                        formData.customer_id === customer.id
                          ? "primary"
                          : "ghost"
                      }
                      onPress={() => {
                        updateFormData("customer_id", customer.id);
                        setCustomerSearch(customer.name);
                      }}
                      style={{ marginBottom: spacing[1] }}
                    />
                  ))}
                </ScrollView>
              )}
              {errors.customer_id && (
                <Text
                  style={{
                    color: colors.error[500],
                    fontSize: 12,
                    marginTop: spacing[1],
                  }}
                >
                  {errors.customer_id}
                </Text>
              )}
            </View>

            <Input
              label="Order Date"
              value={formData.order_date || ""}
              onChangeText={(value) => updateFormData("order_date", value)}
              placeholder="YYYY-MM-DD"
              error={errors.order_date}
            />

            <Input
              label="Order Status"
              value={formData.order_status || "pending"}
              onChangeText={(value) => updateFormData("order_status", value)}
              placeholder="pending, processing, shipped, delivered, cancelled"
            />

            <Input
              label="Total Amount"
              value={formData.total_amount?.toString() || ""}
              onChangeText={(value) =>
                updateFormData("total_amount", parseFloat(value) || 0)
              }
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.total_amount}
            />

            <Input
              label="Order Notes"
              value={formData.notes || ""}
              onChangeText={(value) => updateFormData("notes", value)}
              placeholder="Enter any additional notes..."
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>

        <View
          style={{
            flexDirection: "row",
            gap: spacing[3],
            marginTop: spacing[6],
          }}
        >
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={{ flex: 1 }}
          />
          <Button
            title={
              createOrderMutation.isPending ? "Creating..." : "Create Order"
            }
            variant="primary"
            onPress={handleSubmit}
            disabled={createOrderMutation.isPending}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
