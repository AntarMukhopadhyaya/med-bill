import React, { useState, useMemo } from "react";
import { View, ScrollView, Text, TouchableOpacity, Modal } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SafeScreen, spacing, colors, Button } from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
  FormContainer,
} from "@/components/FormComponents";
import {
  CustomerSelectionModal,
  ItemSelectionModal,
  OrderItemCard,
  OrderSummary,
  OrderItem,
} from "@/components/OrderComponents";
import { orderSchema, validateForm } from "@/lib/validation";
import { useToastHelpers } from "@/lib/toast";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
export default function CreateOrderPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastHelpers();

  // Form state
  const [formData, setFormData] = useState({
    order_number: `ORD-${Date.now()}`,
    customer_id: "",
    order_date: new Date().toISOString().split("T")[0],
    order_status: "pending",
    notes: "",
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Customer selection handlers
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({ ...prev, customer_id: customer.id }));
    if (errors.customer_id) {
      setErrors((prev) => ({ ...prev, customer_id: "" }));
    }
  };

  // Item selection handlers
  const handleSelectItem = (inventoryItem: InventoryItem) => {
    const existingItem = orderItems.find(
      (item) => item.item_id === inventoryItem.id
    );

    if (existingItem) {
      updateOrderItemQuantity(existingItem.id, existingItem.quantity + 1);
      return;
    }

    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      item_id: inventoryItem.id,
      item_name: inventoryItem.name,
      unit_price: Number(inventoryItem.price),
      quantity: 1,
      gst_percent: Number(inventoryItem.gst || 12),
      tax_amount: 0,
      total_price: 0,
    };

    // Calculate tax and total for the new item
    const updatedItem = calculateItemTotals(newItem);
    setOrderItems((prev) => [...prev, updatedItem]);
  };

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
    const totalTax = orderItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal + totalTax;

    const result = {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };

    console.log("Calculations updated:", result);
    return result;
  }, [orderItems]);

  // Add item to order
  const addOrderItem = (inventoryItem: InventoryItem) => {
    const existingItem = orderItems.find(
      (item) => item.item_id === inventoryItem.id
    );

    if (existingItem) {
      updateOrderItemQuantity(existingItem.id, existingItem.quantity + 1);
      return;
    }

    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      item_id: inventoryItem.id,
      item_name: inventoryItem.name,
      unit_price: Number(inventoryItem.price),
      quantity: 1,
      gst_percent: Number(inventoryItem.gst || 12),
      tax_amount: 0,
      total_price: 0,
    };

    // Calculate tax and total for the new item
    const updatedItem = calculateItemTotals(newItem);
    setOrderItems((prev) => [...prev, updatedItem]);
  };

  // Calculate item totals
  const calculateItemTotals = (item: OrderItem): OrderItem => {
    const subtotal = item.unit_price * item.quantity;
    const taxAmount = (subtotal * item.gst_percent) / 100;
    const totalPrice = subtotal + taxAmount;

    return {
      ...item,
      tax_amount: Number(taxAmount.toFixed(2)),
      total_price: Number(totalPrice.toFixed(2)),
    };
  };

  // Update item quantity
  const updateOrderItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeOrderItem(itemId);
      return;
    }

    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, quantity: newQuantity };
          return calculateItemTotals(updatedItem);
        }
        return item;
      })
    );
  };

  // Update item price
  const updateOrderItemPrice = (itemId: string, newPrice: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, unit_price: newPrice };
          return calculateItemTotals(updatedItem);
        }
        return item;
      })
    );
  };

  // Remove item from order
  const removeOrderItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      if (orderItems.length === 0) {
        throw new Error("Please add at least one item to the order");
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderData.order_number,
          customer_id: orderData.customer_id,
          order_date: orderData.order_date,
          order_status: orderData.order_status,
          subtotal: calculations.subtotal,
          total_tax: calculations.totalTax,
          total_amount: calculations.total,
          notes: orderData.notes,
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = orderItems.map((item) => ({
        order_id: order.id,
        item_id: item.item_id,
        item_name: item.item_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        gst_percent: item.gst_percent,
        tax_amount: item.tax_amount,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsData as any);

      if (itemsError) throw itemsError;

      // Update inventory quantities
      for (const item of orderItems) {
        // Get current inventory
        const { data: inventoryData, error: fetchError } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("id", item.item_id)
          .single();

        if (fetchError || !inventoryData) {
          console.warn(
            `Failed to fetch inventory for item ${item.item_id}:`,
            fetchError
          );
          continue;
        }

        const newQuantity = Math.max(
          0,
          (inventoryData as any).quantity - item.quantity
        );

        const { error: inventoryError } = await supabase
          .from("inventory")
          .update({ quantity: newQuantity })
          .eq("id", item.item_id);

        if (inventoryError) {
          console.warn(
            `Failed to update inventory for item ${item.item_id}:`,
            inventoryError
          );
        }
      }

      return order;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
    console.log("Submit called with orderItems:", orderItems.length);
    console.log("Form data:", formData);
    console.log("Calculations:", calculations);

    if (orderItems.length === 0) {
      showError("Error", "Please add at least one item to the order");
      return;
    }

    if (!formData.customer_id) {
      showError("Error", "Please select a customer");
      return;
    }

    // Ensure calculations are valid
    if (!calculations.total || calculations.total <= 0) {
      showError("Error", "Invalid order total. Please check your items.");
      return;
    }

    // Combine form data with calculated totals for validation
    const orderDataForValidation = {
      ...formData,
      total_amount: calculations.total,
    };

    console.log("Order data for validation:", orderDataForValidation);

    const validation = validateForm(orderSchema, orderDataForValidation);

    if (!validation.success) {
      setErrors(validation.errors);
      showError("Validation Error", "Please fix the errors in the form");
      console.error("Validation errors:", validation.errors);
      return;
    }

    console.log("Validation successful, submitting order");
    setErrors({});
    createOrderMutation.mutate(validation.data);
  };

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
          style={{ zIndex: 1 }}
          nestedScrollEnabled={true}
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

            <View style={{ marginBottom: spacing[4] }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[700],
                  marginBottom: spacing[1],
                }}
              >
                Order Status *
              </Text>
              <TouchableOpacity
                onPress={() => setShowStatusModal(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.gray[50],
                  borderWidth: 1,
                  borderColor: errors.order_status
                    ? colors.error[500]
                    : colors.gray[200],
                  borderRadius: 8,
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[3],
                  minHeight: 52,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: formData.order_status
                      ? colors.gray[900]
                      : colors.gray[400],
                    flex: 1,
                  }}
                >
                  {statusOptions.find(
                    (option) => option.value === formData.order_status
                  )?.label || "Select status"}
                </Text>
                <FontAwesome
                  name="chevron-down"
                  size={16}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>
              {errors.order_status && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.error[500],
                    marginTop: spacing[1],
                  }}
                >
                  {errors.order_status}
                </Text>
              )}
            </View>
          </FormSection>

          {/* Customer Selection */}
          <FormSection
            title="Customer"
            description="Select the customer placing this order or create a new one."
          >
            {selectedCustomer ? (
              <View
                style={{
                  backgroundColor: colors.primary[50],
                  borderRadius: 8,
                  padding: spacing[4],
                  marginBottom: spacing[3],
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: colors.primary[900],
                        marginBottom: spacing[1],
                      }}
                    >
                      {selectedCustomer.name}
                    </Text>
                    {selectedCustomer.company_name && (
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.primary[700],
                          marginBottom: spacing[1],
                        }}
                      >
                        {selectedCustomer.company_name}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.primary[600],
                      }}
                    >
                      {selectedCustomer.email} • {selectedCustomer.phone}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCustomerModal(true)}
                    style={{
                      padding: spacing[2],
                    }}
                  >
                    <FontAwesome
                      name="edit"
                      size={16}
                      color={colors.primary[600]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowCustomerModal(true)}
                style={{
                  backgroundColor: colors.gray[50],
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.gray[300],
                  borderStyle: "dashed",
                  padding: spacing[6],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome
                  name="user-plus"
                  size={24}
                  color={colors.gray[400]}
                  style={{ marginBottom: spacing[2] }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: colors.gray[600],
                    marginBottom: spacing[1],
                  }}
                >
                  Select Customer
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[500],
                    textAlign: "center",
                  }}
                >
                  Tap to search and select a customer
                </Text>
              </TouchableOpacity>
            )}

            {errors.customer_id && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.error[500],
                  marginTop: spacing[1],
                }}
              >
                {errors.customer_id}
              </Text>
            )}
          </FormSection>

          {/* Order Items */}
          <FormSection
            title="Order Items"
            description="Add items to this order. Prices and quantities can be modified."
          >
            {/* Add Items Button */}
            <TouchableOpacity
              onPress={() => setShowItemModal(true)}
              style={{
                backgroundColor: colors.gray[50],
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.gray[300],
                borderStyle: "dashed",
                padding: spacing[6],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing[4],
              }}
            >
              <FontAwesome
                name="plus-circle"
                size={24}
                color={colors.primary[500]}
                style={{ marginBottom: spacing[2] }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: colors.primary[600],
                  marginBottom: spacing[1],
                }}
              >
                Add Items
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[500],
                  textAlign: "center",
                }}
              >
                Search and select items from inventory
              </Text>
            </TouchableOpacity>

            {/* Selected Items */}
            {orderItems.map((item) => (
              <OrderItemCard
                key={item.id}
                item={item}
                onUpdateQuantity={(itemId: string, quantity: number) =>
                  updateOrderItemQuantity(itemId, quantity)
                }
                onUpdatePrice={(itemId: string, price: number) =>
                  updateOrderItemPrice(itemId, price)
                }
                onRemove={(itemId: string) => removeOrderItem(itemId)}
              />
            ))}

            {/* Order Summary */}
            {orderItems.length > 0 && (
              <OrderSummary
                subtotal={calculations.subtotal}
                totalTax={calculations.totalTax}
                total={calculations.total}
              />
            )}
          </FormSection>

          {/* Order Notes */}
          <FormSection
            title="Order Notes"
            description="Additional notes for this order."
          >
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
            <Button
              title="Create Order"
              onPress={handleSubmit}
              loading={createOrderMutation.isPending}
              disabled={createOrderMutation.isPending}
            />
          </View>
        </ScrollView>
      </FormContainer>

      {/* Customer Selection Modal */}
      <CustomerSelectionModal
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelectCustomer={(customer) => {
          setSelectedCustomer(customer);
          setFormData((prev) => ({ ...prev, customer_id: customer.id }));
          setShowCustomerModal(false);
        }}
      />

      {/* Item Selection Modal */}
      <ItemSelectionModal
        visible={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSelectItem={addOrderItem}
        selectedItems={orderItems}
      />

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
          {/* Header */}
          <View
            style={{
              backgroundColor: "white",
              paddingTop: spacing[12],
              paddingHorizontal: spacing[4],
              paddingBottom: spacing[4],
              borderBottomWidth: 1,
              borderBottomColor: colors.gray[200],
            }}
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
                Select Order Status
              </Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <FontAwesome name="times" size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Options */}
          <View style={{ flex: 1, padding: spacing[4] }}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  handleInputChange("order_status", option.value);
                  setShowStatusModal(false);
                }}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor:
                    formData.order_status === option.value
                      ? colors.primary[300]
                      : colors.gray[200],
                  padding: spacing[4],
                  marginBottom: spacing[3],
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight:
                      formData.order_status === option.value ? "600" : "400",
                    color:
                      formData.order_status === option.value
                        ? colors.primary[700]
                        : colors.gray[900],
                  }}
                >
                  {option.label}
                </Text>
                {formData.order_status === option.value && (
                  <FontAwesome
                    name="check"
                    size={16}
                    color={colors.primary[500]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}
