import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import {
  FormButton,
  FormSection,
  FormContainer,
} from "@/components/FormComponents";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { inventorySchema, validateForm } from "@/lib/validation";
import { useToastHelpers } from "@/lib/toast";
import { useCreateInventoryItem } from "@/hooks/useInventory";

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
  const createInventoryMutation = useCreateInventoryItem();

  const handleSubmit = () => {
    const validation = validateForm(inventorySchema, formData);
    if (!validation.success) {
      setErrors(validation.errors);
      showError("Validation Error", "Please fix the highlighted fields");
      return;
    }
    setErrors({});
    createInventoryMutation.mutate(validation.data, {
      onSuccess: () => {
        showSuccess("Item Created", "Inventory item added successfully");
        router.back();
      },
      onError: (error: any) => {
        showError("Error", error?.message || "Failed to create inventory item");
      },
    });
  };

  const updateFormData = (
    field: keyof InventoryFormState,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: "rgb(var(--color-background-0))" }}
    >
      <FormContainer onSubmit={handleSubmit}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 32,
            gap: 24,
          }}
        >
          <FormSection
            title="Product Details"
            description="Add a new inventory item with pricing and stock tracking details."
          >
            <View style={{ marginBottom: 16 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                Product Name
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.name}
                  onChangeText={(value) => updateFormData("name", value)}
                  placeholder="Enter product name"
                />
              </Input>
              {errors.name && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.name}
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                SKU
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.sku}
                  onChangeText={(value) => updateFormData("sku", value)}
                  placeholder="Enter SKU / Product Code"
                />
              </Input>
              {errors.sku && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.sku}
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                Category
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.category}
                  onChangeText={(value) => updateFormData("category", value)}
                  placeholder="Enter category"
                />
              </Input>
              {errors.category && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.category}
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                Description
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.description}
                  onChangeText={(value) => updateFormData("description", value)}
                  placeholder="Short description (optional)"
                  multiline
                />
              </Input>
              {errors.description && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.description}
                </Text>
              )}
            </View>
          </FormSection>
          <FormSection
            title="Stock & Pricing"
            description="Maintain healthy stock levels and define price & reorder triggers."
          >
            <View style={{ marginBottom: 16 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                Unit Price
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.unit_price.toString()}
                  onChangeText={(value) =>
                    updateFormData("unit_price", parseFloat(value) || 0)
                  }
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </Input>
              {errors.unit_price && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.unit_price}
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                Quantity in Stock
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.quantity_in_stock.toString()}
                  onChangeText={(value) =>
                    updateFormData(
                      "quantity_in_stock",
                      parseInt(value || "0", 10) >= 0
                        ? parseInt(value || "0", 10)
                        : 0
                    )
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </Input>
              {errors.quantity_in_stock && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.quantity_in_stock}
                </Text>
              )}
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                Reorder Level
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.reorder_level.toString()}
                  onChangeText={(value) =>
                    updateFormData(
                      "reorder_level",
                      parseInt(value || "10", 10) || 10
                    )
                  }
                  placeholder="10"
                  keyboardType="numeric"
                />
              </Input>
              {errors.reorder_level && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.reorder_level}
                </Text>
              )}
            </View>
          </FormSection>
          <FormSection
            title="Supplier"
            description="Optional supplier contact or sourcing details."
          >
            <View style={{ marginBottom: 4 }}>
              <Text className="text-sm font-semibold text-typography-700 mb-1">
                Supplier Information
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  value={formData.supplier_info}
                  onChangeText={(value) =>
                    updateFormData("supplier_info", value)
                  }
                  placeholder="Supplier details (optional)"
                  multiline
                />
              </Input>
              {errors.supplier_info && (
                <Text className="text-xs text-error-500 mt-1">
                  {errors.supplier_info}
                </Text>
              )}
            </View>
          </FormSection>
          <View style={{ paddingTop: 8 }}>
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
    </View>
  );
}
