import React, { useState, useMemo } from "react";
import { View, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SafeScreen, spacing } from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
  FormContainer,
  FormPicker,
} from "@/components/FormComponents";
import { orderSchema, validateForm } from "@/lib/validation";
import { useToastHelpers } from "@/lib/toast";

export default function CreateOrderPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastHelpers();

  // Form state
  const [formData, setFormData] = useState({
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
    queryFn: async () => {
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
      showSuccess("Order Created", "Order has been successfully created");
      router.replace(`/orders/${data.id}` as any);
    },
    onError: (error: any) => {
      showError("Error", error.message || "Failed to create order");
    },
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = () => {
    const validation = validateForm(orderSchema, formData);

    if (!validation.success) {
      setErrors(validation.errors);
      showError("Validation Error", "Please fix the errors in the form");
      return;
    }

    setErrors({});
    createOrderMutation.mutate(validation.data);
  };

  const customerOptions = useMemo(
    () =>
      customers.map((customer: any) => ({
        label: `${customer.name} ${customer.email ? `(${customer.email})` : ""}`,
        value: customer.id,
      })),
    [customers]
  );

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <SafeScreen>
      <Stack.Screen
        options={{
          title: "Create Order",
          headerShown: true,
        }}
      />

      <FormContainer onSubmit={handleSubmit}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing[4],
            paddingBottom: spacing[8],
            gap: spacing[6],
          }}
        >
          {/* Order Information */}
          <FormSection
            title="Order Information"
            description="Provide the basic metadata for this order. Order number is auto-generated but can be edited."
          >
            <FormInput
              label="Order Number"
              value={formData.order_number}
              onChangeText={(value) => handleInputChange("order_number", value)}
              error={errors.order_number}
              placeholder="Auto-generated"
              required
              leftIcon="document"
            />

            <FormInput
              label="Order Date"
              value={formData.order_date}
              onChangeText={(value) => handleInputChange("order_date", value)}
              error={errors.order_date}
              placeholder="YYYY-MM-DD"
              required
              leftIcon="calendar"
            />

            <FormPicker
              label="Order Status"
              value={formData.order_status}
              onValueChange={(value) =>
                handleInputChange("order_status", value)
              }
              options={statusOptions}
              error={errors.order_status}
              required
            />
          </FormSection>

          {/* Customer Selection */}
          <FormSection
            title="Customer"
            description="Select the customer placing this order or create a new one."
          >
            <FormPicker
              label="Select Customer"
              value={formData.customer_id}
              onValueChange={(value) => handleInputChange("customer_id", value)}
              options={customerOptions}
              error={errors.customer_id}
              placeholder="Choose a customer"
              required
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <FormButton
                title="Add New Customer"
                onPress={() => router.push("/customers/create" as any)}
                variant="ghost"
                size="sm"
                leftIcon="add-circle"
              />
            </View>
          </FormSection>

          {/* Order Details */}
          <FormSection
            title="Order Details"
            description="Financial summary and any internal notes related to fulfillment or special handling."
          >
            <FormInput
              label="Total Amount"
              value={formData.total_amount.toString()}
              onChangeText={(value) =>
                handleInputChange("total_amount", parseFloat(value) || 0)
              }
              error={errors.total_amount}
              placeholder="0.00"
              keyboardType="numeric"
              required
              leftIcon="cash"
            />

            <FormInput
              label="Notes"
              value={formData.notes}
              onChangeText={(value) => handleInputChange("notes", value)}
              error={errors.notes}
              placeholder="Additional notes for this order"
              multiline
              numberOfLines={3}
              leftIcon="document-text"
            />
          </FormSection>

          {/* Submit Button */}
          <View style={{ paddingTop: spacing[2] }}>
            <FormButton
              title="Create Order"
              onPress={handleSubmit}
              loading={createOrderMutation.isPending}
              disabled={createOrderMutation.isPending}
              fullWidth
              leftIcon="add"
            />
          </View>
        </ScrollView>
      </FormContainer>
    </SafeScreen>
  );
}
