import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, Text } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  FormInput,
  FormButton,
  FormSection,
  FormContainer,
} from "@/components/FormComponents";
import { customerSchema, validateForm } from "@/lib/validation";
import { useToastHelpers } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button, SafeScreen, spacing } from "@/components/DesignSystem";

const CreateCustomerScreen = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastHelpers();

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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      // Supabase typing expects proper table insert shape; cast to any to allow dynamic form payload
      const { data: customer, error } = await supabase
        .from("customers")
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess("Customer Created", "Customer has been successfully created");
      router.replace(`/customers/${data.id}` as any);
    },
    onError: (error: any) => {
      showError("Error", error.message || "Failed to create customer");
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = () => {
    const validation = validateForm(customerSchema, formData);

    if (!validation.success) {
      setErrors(validation.errors);
      showError("Validation Error", "Please fix the errors in the form");
      return;
    }

    setErrors({});
    createCustomerMutation.mutate(validation.data);
  };

  const copyBillingToShipping = () => {
    setFormData((prev) => ({
      ...prev,
      shipping_address: prev.billing_address || "",
    }));
  };

  return (
    <SafeScreen>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-4">
                <FontAwesome name="arrow-left" size={20} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-900">
                Create Customer
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <FormContainer onSubmit={handleSubmit}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              padding: spacing[6],
              paddingBottom: spacing[8],
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Information */}
            <FormSection
              title="Basic Information"
              description="Core identity details for the customer. Phone number is required for contact."
            >
              <FormInput
                label="Customer Name"
                value={formData.name}
                onChangeText={(value) => handleInputChange("name", value)}
                error={errors.name}
                placeholder="Enter customer name"
                required
                leftIcon="person"
              />

              <FormInput
                label="Email"
                value={formData.email || ""}
                onChangeText={(value) => handleInputChange("email", value)}
                error={errors.email}
                placeholder="customer@example.com"
                keyboardType="email-address"
                leftIcon="mail"
              />

              <FormInput
                label="Phone Number"
                value={formData.phone}
                onChangeText={(value) => handleInputChange("phone", value)}
                error={errors.phone}
                placeholder="+91 XXXXX XXXXX"
                keyboardType="phone-pad"
                required
                leftIcon="call"
              />
            </FormSection>
            {/* Company Information */}
            <FormSection
              title="Company Information"
              description="Optional company-level data used on invoices and business reports."
            >
              <FormInput
                label="Company Name"
                value={formData.company_name || ""}
                onChangeText={(value) =>
                  handleInputChange("company_name", value)
                }
                error={errors.company_name}
                placeholder="Enter company name"
                leftIcon="business"
              />

              <FormInput
                label="GSTIN"
                value={formData.gstin || ""}
                onChangeText={(value) => handleInputChange("gstin", value)}
                error={errors.gstin}
                placeholder="GST Identification Number"
                leftIcon="document-text"
              />

              <FormInput
                label="Country"
                value={formData.country || ""}
                onChangeText={(value) => handleInputChange("country", value)}
                error={errors.country}
                placeholder="Enter country"
                leftIcon="globe"
              />
            </FormSection>
            {/* Address Information */}
            <FormSection
              title="Address Information"
              description="Billing address is used for invoices. Copy it if shipping is identical."
            >
              <FormInput
                label="Billing Address"
                value={formData.billing_address || ""}
                onChangeText={(value) =>
                  handleInputChange("billing_address", value)
                }
                error={errors.billing_address}
                placeholder="Enter billing address"
                multiline
                numberOfLines={3}
                leftIcon="location"
              />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <FormButton
                  title="Copy to Shipping"
                  onPress={copyBillingToShipping}
                  variant="ghost"
                  size="sm"
                  leftIcon="copy"
                />
              </View>

              <FormInput
                label="Shipping Address"
                value={formData.shipping_address || ""}
                onChangeText={(value) =>
                  handleInputChange("shipping_address", value)
                }
                error={errors.shipping_address}
                placeholder="Enter shipping address"
                multiline
                numberOfLines={3}
                leftIcon="location"
              />
            </FormSection>
            <Button
              title="Create Customer"
              onPress={handleSubmit}
              variant="primary"
              disabled={createCustomerMutation.isPending}
              loading={createCustomerMutation.isPending}
            />
          </ScrollView>
        </FormContainer>
      </View>
    </SafeScreen>
  );
};

export default CreateCustomerScreen;
