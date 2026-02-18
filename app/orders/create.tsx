import React, { useState, useCallback } from "react";
import { ScrollView, Modal } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  FormTextarea,
} from "@/components/FormComponents";
import {
  CustomerSelectionModal,
  ItemSelectionModal,
  OrderItemCard,
  OrderSummary,
  OrderItem,
} from "@/components/OrderComponents";
import { useToastHelpers } from "@/lib/toast";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Customer } from "@/types/customers";
import { customerSchema, CustomerFormData } from "@/lib/validation";
import { generateAndUploadInvoicePdf, sharePdf } from "@/lib/invoicePdf";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import * as Sharing from "expo-sharing";
import { useOrderItems } from "@/hooks/useOrderItems";
import { createOrder, createOrderItem } from "@/services/order.service";
import type { OrderInsert } from "@/types/orders";
import { createInvoice } from "@/services/invoice.service";
import { addDays, toISODateStringLocal } from "@/lib/date";

// Form schema with react-hook-form
interface OrderFormData {
  customer_id: string;
  order_date: string;
  order_status: "pending" | "paid";
  notes: string;
  delivery_charge: number;
  purchase_order_number: string;
  total_amount: number; // Required for validation
}

export default function CreateOrderPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastHelpers();

  // React Hook Form setup
  const methods = useForm<OrderFormData>({
    defaultValues: {
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

  const deliveryChargeValue = Number(watchedValues.delivery_charge ?? 0) || 0;

  const {
    orderItems,
    addOrderItem,
    updateOrderItemQuantity,
    updateOrderItemPrice,
    removeOrderItem,
    calculations,
  } = useOrderItems({ deliveryCharge: deliveryChargeValue });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [createShareLoading, setCreateShareLoading] = useState(false);
  const [creatingInlineCustomer, setCreatingInlineCustomer] = useState(false);

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
        showSuccess("Customer Created", "Customer added and selected");
        if (customer) {
          setSelectedCustomer(customer as any);
          setValue("customer_id", (customer as any).id);
        }
        setShowCreateCustomerModal(false);
        inlineCustomerForm.reset();
      } catch (e: any) {
        showError("Error", e.message || "Failed to create customer");
      } finally {
        setCreatingInlineCustomer(false);
      }
    },
  );

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      if (orderItems.length === 0) {
        throw new Error("Please add at least one item to the order");
      }

      const orderInsert: OrderInsert = {
        customer_id: orderData.customer_id,
        order_date: orderData.order_date,
        order_status: orderData.order_status,
        subtotal: calculations.subtotal,
        total_tax: calculations.totalTax,
        delivery_charge: calculations.deliveryCharge,
        purchase_order_number: orderData.purchase_order_number || null,
        total_amount: calculations.total,
        notes: orderData.notes,
      } as OrderInsert;

      const order = await createOrder(orderInsert);

      // Create order items
      for (const item of orderItems) {
        await createOrderItem({
          order_id: (order as any).id,
          item_id: item.item_id,
          item_name: item.item_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          gst_percent: item.gst_percent,
          tax_amount: item.tax_amount,
          total_price: item.total_price,
        } as any);
      }
      // Inventory automatically updated via DB triggers

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

  // Form submission
  const onSubmit = (formData: OrderFormData) => {
    console.log("Submit called with orderItems:", orderItems.length);
    console.log("Form data:", formData);
    console.log("Calculations:", calculations);

    if (orderItems.length === 0) {
      showError("Error", "Please add at least one item to the order");
      return;
    }

    // Ensure calculations are valid
    if (!calculations.total || calculations.total <= 0) {
      showError("Error", "Invalid order total. Please check your items.");
      return;
    }

    // Add calculated total to form data
    const orderDataWithTotal = {
      ...formData,
      total_amount: calculations.total,
    };

    console.log("Order data for submission:", orderDataWithTotal);
    createOrderMutation.mutate(orderDataWithTotal);
  };

  // Combined create order + create & share invoice handler
  const handleCreateOrderAndShareInvoice = useCallback(async () => {
    if (createShareLoading || createOrderMutation.isPending) return;
    try {
      if (orderItems.length === 0) {
        showError("Error", "Please add at least one item to the order");
        return;
      }
      if (!calculations.total || calculations.total <= 0) {
        showError("Error", "Invalid order total");
        return;
      }
      if (!selectedCustomer) {
        showError("Error", "Select or create a customer first");
        return;
      }

      setCreateShareLoading(true);

      const today = new Date();
      const due = addDays(new Date(), 30);

      let uploadedPath: string | null = null;
      let publicUrl: string | null = null;
      let createdOrder: any = null;
      let filePath: string | null = null;

      try {
        const orderInsert: OrderInsert = {
          customer_id: watchedValues.customer_id,
          order_date: watchedValues.order_date,
          order_status: watchedValues.order_status,
          subtotal: calculations.subtotal,
          total_tax: calculations.totalTax,
          delivery_charge: calculations.deliveryCharge,
          purchase_order_number: watchedValues.purchase_order_number || null,
          total_amount: calculations.total,
          notes: watchedValues.notes,
        } as OrderInsert;

        const order = await createOrder(orderInsert);
        createdOrder = order;

        for (const item of orderItems) {
          await createOrderItem({
            order_id: (order as any).id,
            item_id: item.item_id,
            item_name: item.item_name,
            unit_price: item.unit_price,
            quantity: item.quantity,
            gst_percent: item.gst_percent,
            tax_amount: item.tax_amount,
            total_price: item.total_price,
          } as any);
        }

        const invoice_number = (order as any).order_number;

        const stubInvoice: any = {
          invoice_number,
          issue_date: toISODateStringLocal(today),
          due_date: toISODateStringLocal(due),
          amount: calculations.subtotal,
          tax: calculations.totalTax,
          delivery_charge: calculations.deliveryCharge,
        };

        const pdfItems = orderItems.map((it) => ({
          item_name: it.item_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          gst_percent: it.gst_percent,
          total_price: it.total_price,
          tax_amount: it.tax_amount,
          hsn: (it as any).hsn || (it as any).inventory?.hsn || "9018",
        }));

        const pdfResult = await generateAndUploadInvoicePdf({
          invoice: stubInvoice as any,
          customer: selectedCustomer as any,
          orderItems: pdfItems,
          logo: require("@/assets/images/icon.png"),
          filename: `${invoice_number}.pdf`,
          bucket: INVOICE_PDF_BUCKET,
        });

        filePath = pdfResult.filePath;
        uploadedPath = pdfResult.storagePath;
        publicUrl = pdfResult.publicUrl || null;

        await createInvoice({
          invoice_number,
          order_id: (order as any).id,
          customer_id: (order as any).customer_id,
          issue_date: toISODateStringLocal(today),
          due_date: toISODateStringLocal(due),
          amount: calculations.subtotal,
          tax: calculations.totalTax,
          delivery_charge: calculations.deliveryCharge,
          pdf_url: publicUrl || undefined,
        } as any);
      } catch (dbErr: any) {
        if (uploadedPath) {
          try {
            await supabase.storage
              .from(INVOICE_PDF_BUCKET)
              .remove([uploadedPath]);
          } catch {}
        }
        if (createdOrder) {
          try {
            await supabase
              .from("order_items")
              .delete()
              .eq("order_id", createdOrder.id);
            await supabase.from("orders").delete().eq("id", createdOrder.id);
          } catch {}
        }
        throw dbErr;
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (filePath) {
        await sharePdf(filePath);
      }
      showSuccess("Order & Invoice Ready", "Order created and invoice shared");
      setTimeout(() => {
        router.replace(`/orders/${(createdOrder as any).id}` as any);
      }, 500);
    } catch (e: any) {
      showError("Error", e.message || "Failed to process create & share");
    } finally {
      setCreateShareLoading(false);
    }
  }, [
    createShareLoading,
    createOrderMutation.isPending,
    orderItems,
    calculations,
    selectedCustomer,
    watchedValues,
  ]);

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
  ];

  return (
    <StandardPage padding="none" backgroundColor="bg-background">
      <StandardHeader
        title="Create Order"
        subtitle="Create a new order for a customer"
        showBackButton={true}
        showAddButton={false}
        rightElement={
          <Pressable
            onPress={() =>
              showSuccess("Info", "Save as draft feature coming soon")
            }
            className="px-3 py-2 rounded-lg bg-background-0 border border-outline-200"
            accessibilityLabel="Save as draft"
            accessibilityRole="button"
          >
            <Text className="text-sm font-medium text-typography-700">
              Draft
            </Text>
          </Pressable>
        }
      />

      <FormProvider {...methods}>
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
          <VStack space="lg" className="px-4 pb-8">
            {/* Order Information */}
            <FormSection
              title="Order Information"
              description="Provide the basic metadata for this order. Order number will be generated automatically by the system."
            >
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
              description="Select the customer placing this order or create a new one."
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
              description="Add items to this order. Prices and quantities can be modified."
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
              <FormTextarea
                name="notes"
                label="Notes"
                placeholder="Additional notes for this order"
              />
            </FormSection>

            {/* Submit Button */}
            <Box className="pt-2">
              <HStack className="gap-3">
                <Box className="flex-1">
                  <FormButton
                    title={
                      createShareLoading ? "Processing..." : "Create & Share"
                    }
                    onPress={handleCreateOrderAndShareInvoice}
                    loading={createShareLoading}
                    disabled={
                      createShareLoading || createOrderMutation.isPending
                    }
                    variant="outline"
                  />
                </Box>
              </HStack>
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
