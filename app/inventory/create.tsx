import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SafeScreen, spacing } from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
  FormContainer,
} from "@/components/FormComponents";
import { inventorySchema, validateForm } from "@/lib/validation";
import { useToastHelpers } from "@/lib/toast";

interface InventoryFormState {
  name: string;
  sku: string;
  category: string;
  description: string;
  unit_price: number;
  quantity_in_stock: number;
  reorder_level: number;
  supplier_info: string;
}

export default function CreateInventoryPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastHelpers();

  // Form state
  const [formData, setFormData] = useState<InventoryFormState>({
    name: "",
    sku: "",
    category: "",
    description: "",
    unit_price: 0,
    quantity_in_stock: 0,
    reorder_level: 10,
    supplier_info: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create inventory mutation
  const createInventoryMutation = useMutation({
    mutationFn: async (inventoryData: any) => {
      const { data, error } = await supabase
        .from("inventory")
        .insert(inventoryData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showSuccess("Item Created", "Inventory item added successfully");
      router.back();
    },
    onError: (error: any) => {
      showError("Error", error.message || "Failed to create inventory item");
    },
  });

  const handleSubmit = () => {
    const validation = validateForm(inventorySchema, formData);
    if (!validation.success) {
      setErrors(validation.errors);
      showError("Validation Error", "Please fix the highlighted fields");
      return;
    }
    setErrors({});
    createInventoryMutation.mutate(validation.data);
  };

  const updateFormData = (field: keyof InventoryFormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <SafeScreen>
      <FormContainer onSubmit={handleSubmit}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing[4],
            paddingBottom: spacing[8],
            gap: spacing[6],
          }}
        >
          <FormSection
            title="Product Details"
            description="Add a new inventory item with pricing and stock tracking details."
          >
            <FormInput
              label="Product Name"
              value={formData.name}
              onChangeText={(value) => updateFormData("name", value)}
              placeholder="Enter product name"
              error={errors.name}
              required
              leftIcon="pricetag"
            />
            <FormInput
              label="SKU"
              value={formData.sku}
              onChangeText={(value) => updateFormData("sku", value)}
              placeholder="Enter SKU / Product Code"
              error={errors.sku}
              required
              leftIcon="barcode"
            />
            <FormInput
              label="Category"
              value={formData.category}
              onChangeText={(value) => updateFormData("category", value)}
              placeholder="Enter category"
              error={errors.category}
              required
              leftIcon="folder"
            />
            <FormInput
              label="Description"
              value={formData.description}
              onChangeText={(value) => updateFormData("description", value)}
              placeholder="Short description (optional)"
              multiline
              numberOfLines={3}
              leftIcon="information-circle"
            />
          </FormSection>
          <FormSection
            title="Stock & Pricing"
            description="Maintain healthy stock levels and define price & reorder triggers."
          >
            <FormInput
              label="Unit Price"
              value={formData.unit_price.toString()}
              onChangeText={(value) =>
                updateFormData("unit_price", parseFloat(value) || 0)
              }
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.unit_price}
              required
              leftIcon="cash"
            />
            <FormInput
              label="Quantity in Stock"
              value={formData.quantity_in_stock.toString()}
              onChangeText={(value) =>
                updateFormData(
                  "quantity_in_stock",
                  parseInt(value) >= 0 ? parseInt(value) : 0
                )
              }
              placeholder="0"
              keyboardType="numeric"
              error={errors.quantity_in_stock}
              required
              leftIcon="cube"
            />
            <FormInput
              label="Reorder Level"
              value={formData.reorder_level.toString()}
              onChangeText={(value) =>
                updateFormData("reorder_level", parseInt(value) || 10)
              }
              placeholder="10"
              keyboardType="numeric"
              leftIcon="alert-circle"
            />
          </FormSection>
          <FormSection
            title="Supplier"
            description="Optional supplier contact or sourcing details."
          >
            <FormInput
              label="Supplier Information"
              value={formData.supplier_info}
              onChangeText={(value) => updateFormData("supplier_info", value)}
              placeholder="Supplier details (optional)"
              multiline
              numberOfLines={2}
              leftIcon="people"
            />
          </FormSection>
          <View style={{ paddingTop: spacing[2] }}>
            <FormButton
              title={
                createInventoryMutation.isPending
                  ? "Creating..."
                  : "Create Item"
              }
              onPress={handleSubmit}
              loading={createInventoryMutation.isPending}
              disabled={createInventoryMutation.isPending}
              fullWidth
              leftIcon="add"
            />
          </View>
        </ScrollView>
      </FormContainer>
    </SafeScreen>
  );
}
