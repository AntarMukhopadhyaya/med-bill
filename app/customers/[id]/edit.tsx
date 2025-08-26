import React, { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Header,
  Card,
  Button,
  Input,
  EmptyState,
  colors,
  spacing,
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export default function EditCustomerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    gstin: "",
    billing_address: "",
    shipping_address: "",
    country: "",
  });

  // Fetch customer data
  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async (): Promise<Customer | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          company_name: data.company_name || "",
          gstin: data.gstin || "",
          billing_address: data.billing_address || "",
          shipping_address: data.shipping_address || "",
          country: data.country || "",
        });
      }
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (updateData: CustomerUpdate) => {
      if (!id) throw new Error("No customer ID");

      const { data, error } = await supabase
        .from("customers")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customer-details", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      Alert.alert("Success", "Customer updated successfully");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update customer");
    },
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Customer name is required");
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert("Error", "Phone number is required");
      return;
    }

    updateCustomerMutation.mutate(formData);
  };

  const updateFormData = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header title="Edit Customer" onBack={() => router.back()} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Customer"
            description="Fetching customer details..."
          />
        </View>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header title="Customer Not Found" onBack={() => router.back()} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="user-times"
            title="Customer Not Found"
            description="The customer you're trying to edit doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
      <Header
        title="Edit Customer"
        subtitle={customer.name}
        onBack={() => router.back()}
        rightElement={
          <Button
            title="Save"
            onPress={handleSave}
            variant="primary"
            size="sm"
            loading={updateCustomerMutation.isPending}
            disabled={updateCustomerMutation.isPending}
          />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
      >
        {/* Basic Information */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Basic Information
          </Text>

          <View style={{ gap: spacing[4] }}>
            <Input
              label="Customer Name *"
              value={formData.name}
              onChangeText={(value) => updateFormData("name", value)}
              placeholder="Enter customer name"
              required
            />

            <Input
              label="Company Name"
              value={formData.company_name}
              onChangeText={(value) => updateFormData("company_name", value)}
              placeholder="Enter company name (optional)"
            />

            <Input
              label="Phone Number *"
              value={formData.phone}
              onChangeText={(value) => updateFormData("phone", value)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              required
            />

            <Input
              label="Email Address"
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Country"
              value={formData.country}
              onChangeText={(value) => updateFormData("country", value)}
              placeholder="Enter country"
            />
          </View>
        </Card>

        {/* Business Information */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Business Information
          </Text>

          <View style={{ gap: spacing[4] }}>
            <Input
              label="GSTIN"
              value={formData.gstin}
              onChangeText={(value) => updateFormData("gstin", value)}
              placeholder="Enter GSTIN (optional)"
              autoCapitalize="characters"
            />
          </View>
        </Card>

        {/* Address Information */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Address Information
          </Text>

          <View style={{ gap: spacing[4] }}>
            <Input
              label="Billing Address"
              value={formData.billing_address}
              onChangeText={(value) => updateFormData("billing_address", value)}
              placeholder="Enter billing address"
              multiline
              numberOfLines={3}
            />

            <Input
              label="Shipping Address"
              value={formData.shipping_address}
              onChangeText={(value) =>
                updateFormData("shipping_address", value)
              }
              placeholder="Enter shipping address (leave empty to use billing address)"
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={{ gap: spacing[3], marginBottom: spacing[6] }}>
          <Button
            title="Save Customer"
            onPress={handleSave}
            variant="primary"
            loading={updateCustomerMutation.isPending}
            disabled={updateCustomerMutation.isPending}
          />

          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            disabled={updateCustomerMutation.isPending}
          />
        </View>
      </ScrollView>
    </View>
  );
}
