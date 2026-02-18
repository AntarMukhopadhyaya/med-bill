import React, { useState, useMemo, useCallback, useEffect } from "react";
import { ScrollView, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";
import { StandardPage, StandardHeader } from "@/components/layout";
import {
  FormInput,
  FormDateInput,
  FormButton,
  FormSection,
  FormContainer,
  FormSelect,
} from "@/components/FormComponents";
import {
  CustomerSelectionModal,
  ItemSelectionModal,
  OrderItemCard,
  OrderSummary,
  OrderItem,
} from "@/components/OrderComponents";
import { useToast } from "@/lib/toast";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Customer } from "@/types/customers";
import type { InventoryItem } from "@/types/inventory";
import type { Order } from "@/types/orders";
import { customerSchema, CustomerFormData } from "@/lib/validation";
import { parseDate, toISODateStringLocal } from "@/lib/date";

// Form schema with react-hook-form
interface OrderFormData {
  order_number: string;
  customer_id: string;
  order_date: string;
  order_status: "pending" | "paid";
  notes: string;
  delivery_charge: number;
  purchase_order_number: string;
  total_amount: number;
}

export default function EditOrderPage() {
  const { id: orderId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch order data
  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single()
        .throwOnError();

      return data as Order;
    },
    enabled: !!orderId,
  });

  // Fetch order items
  const { data: orderItemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId,
  });

  // Fetch customer data
  const { data: customerData } = useQuery({
    queryKey: ["customer", orderData?.customer_id],
    queryFn: async () => {
      if (!orderData?.customer_id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", orderData.customer_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderData?.customer_id,
  });

  // React Hook Form setup
  const methods = useForm<OrderFormData>({
    defaultValues: {
      order_number: "",
      customer_id: "",
      order_date: toISODateStringLocal(new Date()),
      order_status: "pending",
      notes: "",
      delivery_charge: 0,
      purchase_order_number: "",
      total_amount: 0,
    },
  });

  const { handleSubmit, setValue, watch, reset } = methods;
  const watchedValues = watch();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [createShareLoading, setCreateShareLoading] = useState(false);
  const [creatingInlineCustomer, setCreatingInlineCustomer] = useState(false);

  // Populate form when data is loaded
  useEffect(() => {
    if (orderData) {
      reset({
        order_number: orderData.order_number || "",
        customer_id: orderData.customer_id || "",
        order_date: orderData.order_date
          ? toISODateStringLocal(parseDate(orderData.order_date) ?? new Date())
          : toISODateStringLocal(new Date()),
        order_status: orderData.order_status || "pending",
        notes: orderData.notes || "",
        delivery_charge: orderData.delivery_charge || 0,
        purchase_order_number: orderData.purchase_order_number || "",
        total_amount: orderData.total_amount || 0,
      });
    }
  }, [orderData, reset]);

  // Set customer when data is loaded
  useEffect(() => {
    if (customerData) {
      setSelectedCustomer(customerData);
    }
  }, [customerData]);

  // Set order items when data is loaded
  useEffect(() => {
    if (orderItemsData) {
      const items: OrderItem[] = orderItemsData.map((item: OrderItem) => ({
        id: item.id,
        item_id: item.item_id,
        item_name: item.item_name,
        unit_price: Number(item.unit_price),
        quantity: item.quantity,
        gst_percent: Number(item.gst_percent),
        tax_amount: Number(item.tax_amount),
        total_price: Number(item.total_price),
      }));
      setOrderItems(items);
      setOriginalItems(items);
    }
  }, [orderItemsData]);

  // Customer selection handlers
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setValue("customer_id", customer.id);
  };

  // Inline Customer Form (separate form instance)
  const inlineCustomerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company_name: "",
      gstin: "",
      billing_address: "",
      shipping_address: "",
      state: "",
    },
  });

  const copyBillingToShippingInline = () => {
    const billing = inlineCustomerForm.getValues("billing_address");
    inlineCustomerForm.setValue("shipping_address", billing || "");
  };

  const handleCreateInlineCustomer = inlineCustomerForm.handleSubmit(
    async (data) => {
      try {
        setCreatingInlineCustomer(true);
        const { data: customer, error } = await supabase
          .from("customers")
          .insert(data as any)
          .select()
          .single();
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        toast.showSuccess("Customer Created", "Customer added and selected");
        if (customer) {
          setSelectedCustomer(customer as any);
          setValue("customer_id", (customer as any).id);
        }
        setShowCreateCustomerModal(false);
        inlineCustomerForm.reset();
      } catch (e: any) {
        toast.showError("Error", e.message || "Failed to create customer");
      } finally {
        setCreatingInlineCustomer(false);
      }
    },
  );

  // Item selection handlers
  const handleSelectItem = (inventoryItem: InventoryItem) => {
    const existingItem = orderItems.find(
      (item) => item.item_id === inventoryItem.id,
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
    const updatedItem = calculateItemTotals(newItem);
    setOrderItems((prev) => [...prev, updatedItem]);
  };

  const addOrderItem = (inventoryItem: InventoryItem) =>
    handleSelectItem(inventoryItem);

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
      }),
    );
  };

  const calculations = useMemo(() => {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const totalTax = orderItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const deliveryCharge = Number(watchedValues.delivery_charge) || 0;
    const total = subtotal + totalTax + deliveryCharge;
    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      deliveryCharge: Number(deliveryCharge.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [orderItems, watchedValues.delivery_charge]);

  // Update item price
  const updateOrderItemPrice = (itemId: string, newPrice: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, unit_price: newPrice };
          return calculateItemTotals(updatedItem);
        }
        return item;
      }),
    );
  };

  // Remove item from order
  const removeOrderItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      if (orderItems.length === 0) {
        throw new Error("Please add at least one item to the order");
      }

      // Update order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .update({
          order_number: orderData.order_number,
          customer_id: orderData.customer_id,
          order_date: orderData.order_date,
          order_status: orderData.order_status,
          subtotal: calculations.subtotal,
          total_tax: calculations.totalTax,
          delivery_charge: calculations.deliveryCharge,
          purchase_order_number: orderData.purchase_order_number || null,
          total_amount: calculations.total,
          notes: orderData.notes,
        } as any)
        .eq("id", orderId)
        .select()
        .single();

      if (orderError) throw orderError;

      // Get current items from database to compare with our local state
      const { data: currentDbItems } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      // Identify items to delete (in DB but not in our current items)
      const currentItemIds = orderItems.map((item) => item.item_id);
      const itemsToDelete = ((currentDbItems as OrderItem[]) || []).filter(
        (dbItem) => !currentItemIds.includes(dbItem.item_id),
      );

      // Delete removed items
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("order_items")
          .delete()
          .in(
            "id",
            itemsToDelete.map((item) => item.id),
          );
        if (deleteError) throw deleteError;
        // Automatically handled inventory restock for deleted items
      }

      // Upsert all current items
      for (const item of orderItems) {
        // Check if this item already exists in the database
        const existingDbItem = ((currentDbItems as OrderItem[]) || []).find(
          (dbItem) => dbItem.item_id === item.item_id,
        );

        if (existingDbItem) {
          // Update existing item
          const { error: updateError } = await supabase
            .from("order_items")
            .update({
              item_name: item.item_name,
              unit_price: item.unit_price,
              quantity: item.quantity,
              gst_percent: item.gst_percent,
              tax_amount: item.tax_amount,
              total_price: item.total_price,
            })
            .eq("id", existingDbItem.id);

          if (updateError) throw updateError;
        } else {
          // Insert new item
          const { error: insertError } = await supabase
            .from("order_items")
            .insert({
              order_id: orderId,
              item_id: item.item_id,
              item_name: item.item_name,
              unit_price: item.unit_price,
              quantity: item.quantity,
              gst_percent: item.gst_percent,
              tax_amount: item.tax_amount,
              total_price: item.total_price,
            } as any);

          if (insertError) throw insertError;
        }
        // Automatically handled inventory deduction for added/updated items
      }

      return order;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-details", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.showSuccess("Order Updated", "Order has been successfully updated");
      router.back();
    },
    onError: (error: any) => {
      console.error("Update order error:", error);
      toast.showError("Error", error.message || "Failed to update order");
    },
  });
  // Form submission
  const onSubmit = (formData: OrderFormData) => {
    if (orderItems.length === 0) {
      toast.showError("Error", "Please add at least one item to the order");
      return;
    }

    if (!calculations.total || calculations.total <= 0) {
      toast.showError("Error", "Invalid order total. Please check your items.");
      return;
    }

    const orderDataWithTotal = {
      ...formData,
      total_amount: calculations.total,
    };

    updateOrderMutation.mutate(orderDataWithTotal);
  };

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
  ];

  if (orderLoading || itemsLoading) {
    return (
      <StandardPage padding="none" backgroundColor="bg-background">
        <StandardHeader
          title="Edit Order"
          subtitle="Loading order details..."
          showBackButton={true}
        />
        <Box className="flex-1 items-center justify-center">
          <Text>Loading order details...</Text>
        </Box>
      </StandardPage>
    );
  }

  return (
    <StandardPage padding="none" backgroundColor="bg-background">
      <StandardHeader
        title="Edit Order"
        subtitle="Update order details"
        showBackButton={true}
        showAddButton={false}
      />

      <FormProvider {...methods}>
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
          <VStack space="lg" className="px-4 pb-8">
            {/* Order Information */}
            <FormSection
              title="Order Information"
              description="Update the basic metadata for this order."
            >
              <FormInput
                name="order_number"
                label="Order Number"
                placeholder="Order number"
                required
              />

              <FormDateInput
                name="order_date"
                label="Order Date"
                placeholder="DD/MM/YYYY"
                required
              />

              <FormSelect
                name="order_status"
                label="Order Status"
                options={statusOptions}
                placeholder="Select status"
                required
              />
            </FormSection>

            {/* Customer Selection */}
            <FormSection
              title="Customer"
              description="Select the customer for this order or create a new one."
            >
              {selectedCustomer ? (
                <Box className="rounded-lg bg-primary-50 p-4 mb-3">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="text-base font-semibold text-primary-900 mb-1">
                        {selectedCustomer.name}
                      </Text>
                      {selectedCustomer.company_name && (
                        <Text className="text-sm text-primary-700 mb-1">
                          {selectedCustomer.company_name}
                        </Text>
                      )}
                      <Text className="text-xs text-primary-600">
                        {selectedCustomer.email} • {selectedCustomer.phone}
                      </Text>
                    </VStack>
                    <Pressable
                      onPress={() => setShowCustomerModal(true)}
                      className="p-2 rounded-md"
                    >
                      <FontAwesome name="edit" size={16} color="#2563eb" />
                    </Pressable>
                  </HStack>
                </Box>
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowCustomerModal(true)}
                    className="rounded-lg border border-outline-300 border-dashed bg-background p-6 items-center justify-center"
                  >
                    <FontAwesome
                      name="user-plus"
                      size={24}
                      color="#6b7280"
                      style={{ marginBottom: 8 }}
                    />
                    <Text className="text-base font-medium text-typography-600 mb-1">
                      Select Customer
                    </Text>
                    <Text className="text-xs text-typography-500 text-center">
                      Tap to search and select a customer
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowCreateCustomerModal(true)}
                    className="mt-3 rounded-lg border border-outline-200 bg-background-0 p-4 items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Create new customer"
                  >
                    <FontAwesome
                      name="plus"
                      size={20}
                      color="#2563eb"
                      style={{ marginBottom: 4 }}
                    />
                    <Text className="text-sm font-medium text-primary-700">
                      Create New Customer
                    </Text>
                  </Pressable>
                </>
              )}
            </FormSection>

            {/* Order Items */}
            <FormSection
              title="Order Items"
              description="Update items in this order. Prices and quantities can be modified."
            >
              {/* Add Items Button */}
              <Pressable
                onPress={() => setShowItemModal(true)}
                className="rounded-lg border border-outline-300 border-dashed bg-background p-6 items-center justify-center mb-4"
              >
                <FontAwesome
                  name="plus-circle"
                  size={24}
                  color="#2563eb"
                  style={{ marginBottom: 8 }}
                />
                <Text className="text-base font-medium text-primary-600 mb-1">
                  Add Items
                </Text>
                <Text className="text-xs text-typography-500 text-center">
                  Search and select items from inventory
                </Text>
              </Pressable>

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
                  deliveryCharge={calculations.deliveryCharge}
                />
              )}
            </FormSection>
            <FormSection
              title="Additional Information"
              description="Delivery charges and purchase order details"
            >
              <FormInput
                name="delivery_charge"
                label="Delivery Charge (₹)"
                placeholder="0.00"
                keyboardType="numeric"
              />

              <FormInput
                name="purchase_order_number"
                label="Purchase Order Number"
                placeholder="Optional purchase order number"
              />
            </FormSection>
            {/* Order Notes */}
            <FormSection
              title="Order Notes"
              description="Additional notes for this order."
            >
              <FormInput
                name="notes"
                label="Notes"
                placeholder="Additional notes for this order"
                multiline
                numberOfLines={3}
              />
            </FormSection>

            {/* Submit Button */}
            <Box className="pt-2">
              <FormButton
                title="Update Order"
                onPress={handleSubmit(onSubmit)}
                loading={updateOrderMutation.isPending}
                disabled={updateOrderMutation.isPending}
              />
            </Box>
          </VStack>
        </FormContainer>

        {/* Customer Selection Modal */}
        <CustomerSelectionModal
          visible={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSelectCustomer={(customer) => {
            setSelectedCustomer(customer);
            setValue("customer_id", customer.id);
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

        {/* Inline Create Customer Modal */}
        <Modal
          visible={showCreateCustomerModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <FormProvider {...inlineCustomerForm}>
            <ScrollView className="flex-1 bg-background p-4">
              <HStack className="items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-typography-900">
                  New Customer
                </Text>
                <Pressable
                  onPress={() =>
                    !creatingInlineCustomer && setShowCreateCustomerModal(false)
                  }
                  className="p-2"
                >
                  <FontAwesome name="times" size={20} color="#6b7280" />
                </Pressable>
              </HStack>
              <VStack space="md">
                <FormInput
                  name="name"
                  label="Name"
                  placeholder="Customer name"
                  required
                />
                <FormInput
                  name="phone"
                  label="Phone"
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  required
                />
                <FormInput
                  name="email"
                  label="Email"
                  placeholder="Email"
                  keyboardType="email-address"
                />
                <FormInput
                  name="company_name"
                  label="Company Name"
                  placeholder="Company"
                />
                <FormInput
                  name="gstin"
                  label="GSTIN"
                  placeholder="GST Identification Number"
                />
                <FormInput name="state" label="State" placeholder="State" />
                <FormInput
                  name="billing_address"
                  label="Billing Address"
                  placeholder="Billing address"
                  multiline
                  numberOfLines={3}
                />
                <Pressable
                  onPress={copyBillingToShippingInline}
                  className="self-start px-3 py-1 rounded-md border border-outline-300"
                >
                  <Text className="text-xs font-medium text-typography-600">
                    Copy Billing to Shipping
                  </Text>
                </Pressable>
                <FormInput
                  name="shipping_address"
                  label="Shipping Address"
                  placeholder="Shipping address"
                  multiline
                  numberOfLines={3}
                />
                <HStack className="mt-4 gap-3">
                  <Pressable
                    onPress={() =>
                      !creatingInlineCustomer &&
                      setShowCreateCustomerModal(false)
                    }
                    className="flex-1 rounded-lg border border-outline-300 py-3 items-center"
                  >
                    <Text className="text-sm font-medium text-typography-700">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreateInlineCustomer}
                    disabled={creatingInlineCustomer}
                    className={`flex-1 rounded-lg py-3 items-center ${
                      creatingInlineCustomer
                        ? "bg-primary-300"
                        : "bg-primary-600"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-white">
                      {creatingInlineCustomer ? "Creating..." : "Create"}
                    </Text>
                  </Pressable>
                </HStack>
              </VStack>
            </ScrollView>
          </FormProvider>
        </Modal>

        {/* Status Selection Modal */}
        <Modal
          visible={showStatusModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <VStack className="flex-1 bg-background">
            <Box className="pt-12 px-4 pb-4 bg-background-0 border-b border-border">
              <HStack className="items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-typography-900">
                  Select Order Status
                </Text>
                <Pressable onPress={() => setShowStatusModal(false)}>
                  <FontAwesome name="times" size={20} color="#6b7280" />
                </Pressable>
              </HStack>
            </Box>
            <VStack className="flex-1 p-4">
              {statusOptions.map((option) => {
                const active = watchedValues.order_status === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setValue(
                        "order_status",
                        option.value as "pending" | "paid",
                      );
                      setShowStatusModal(false);
                    }}
                    className={`rounded-lg border p-4 mb-3 bg-background-0 flex-row items-center justify-between ${
                      active ? "border-primary-300" : "border-outline-200"
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        active
                          ? "font-semibold text-primary-700"
                          : "text-typography-900"
                      }`}
                    >
                      {option.label}
                    </Text>
                    {active && (
                      <FontAwesome name="check" size={16} color="#2563eb" />
                    )}
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>
        </Modal>
      </FormProvider>
    </StandardPage>
  );
}
