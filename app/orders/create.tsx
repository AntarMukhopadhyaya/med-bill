import React, { useState, useMemo, useCallback } from "react";
import { ScrollView, Modal } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { Button as DSButton } from "@/components/DesignSystem"; // legacy button if still needed
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Box } from "@/components/ui/box";
import { StandardPage, StandardHeader } from "@/components/layout";
import {
  FormInput,
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
import { useToastHelpers } from "@/lib/toast";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Database } from "@/types/database.types";
import { customerSchema, CustomerFormData } from "@/lib/validation";
import {
  generateInvoicePdf,
  uploadPdfToSupabase,
  writePdfToFile,
} from "@/lib/invoicePdf";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Buffer } from "buffer";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];

// Form schema with react-hook-form
interface OrderFormData {
  order_number: string;
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
      order_number: `ORD-${Date.now()}`,
      customer_id: "",
      order_date: new Date().toISOString().split("T")[0],
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
    null
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
      country: "",
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
    }
  );

  // Item selection handlers (re-added after refactor)
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
      })
    );
  };

  const calculations = useMemo(() => {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
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
          delivery_charge: calculations.deliveryCharge,
          purchase_order_number: orderData.purchase_order_number || null,
          total_amount: calculations.total,
          notes: orderData.notes,
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = orderItems.map((item) => ({
        order_id: (order as any).id,
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

        const { error: inventoryError } = await (supabase as any)
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

  // Generate invoice number (reuse logic similar to invoice create page)
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const time =
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0");
    return `INV${year}${month}${day}-${time}`;
  };

  // Combined create order + create & share invoice handler (PDF first, then DB, manual rollback)
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
      // Prepare stub invoice for PDF generation
      const invoice_number = generateInvoiceNumber();
      const today = new Date();
      const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const stubInvoice: any = {
        invoice_number,
        issue_date: today.toISOString().split("T")[0],
        due_date: due.toISOString().split("T")[0],
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
      const pdfBytes = await generateInvoicePdf({
        invoice: stubInvoice,
        customer: selectedCustomer as any,
        orderItems: pdfItems,
      });

      // Use consistent file naming like invoice details page
      const filePath = await writePdfToFile(pdfBytes, `${invoice_number}.pdf`);

      let uploadedPath: string | null = null;
      let publicUrl: string | null = null;
      try {
        const uploadRes = await uploadPdfToSupabase(
          filePath,
          INVOICE_PDF_BUCKET
        );
        uploadedPath = uploadRes.storagePath;
        publicUrl = uploadRes.publicUrl || null;
      } catch (e: any) {
        throw new Error(`PDF upload failed: ${e.message || e}`);
      }
      // Pseudo-transaction for order + items + invoice
      let createdOrder: any = null;
      try {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            order_number: watchedValues.order_number,
            customer_id: watchedValues.customer_id,
            order_date: watchedValues.order_date,
            order_status: watchedValues.order_status,
            subtotal: calculations.subtotal,
            total_tax: calculations.totalTax,
            delivery_charge: calculations.deliveryCharge,
            purchase_order_number: watchedValues.purchase_order_number || null,
            total_amount: calculations.total,
            notes: watchedValues.notes,
          } as any)
          .select()
          .single();
        if (orderError) throw orderError;
        createdOrder = order;
        const orderItemsData = orderItems.map((item) => ({
          order_id: (order as any).id,
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
        for (const item of orderItems) {
          try {
            const { data: inventoryData, error: fetchError } = await supabase
              .from("inventory")
              .select("quantity")
              .eq("id", item.item_id)
              .single();
            if (fetchError || !inventoryData) continue;
            const newQuantity = Math.max(
              0,
              (inventoryData as any).quantity - item.quantity
            );
            await (supabase as any)
              .from("inventory")
              .update({ quantity: newQuantity })
              .eq("id", item.item_id);
          } catch {}
        }
        const { error: invoiceError } = await supabase.from("invoices").insert({
          invoice_number,
          order_id: (order as any).id,
          customer_id: (order as any).customer_id,
          issue_date: today.toISOString().split("T")[0],
          due_date: due.toISOString().split("T")[0],
          amount: calculations.subtotal, // Base amount without tax and delivery
          tax: calculations.totalTax,
          delivery_charge: calculations.deliveryCharge,
          pdf_url: publicUrl,
        } as any);
        if (invoiceError) throw invoiceError;
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
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/pdf",
          dialogTitle: "Share Invoice PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        showError("Sharing Unavailable", "Device does not support sharing");
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
              description="Provide the basic metadata for this order. Order number is auto-generated but can be edited."
            >
              <FormInput
                name="order_number"
                label="Order Number"
                placeholder="Auto-generated"
                required
              />

              <FormInput
                name="order_date"
                label="Order Date"
                placeholder="YYYY-MM-DD"
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
              <HStack className="gap-3">
                <Box className="flex-1">
                  <FormButton
                    title="Create Order"
                    onPress={handleSubmit(onSubmit)}
                    loading={createOrderMutation.isPending}
                    disabled={
                      createOrderMutation.isPending || createShareLoading
                    }
                  />
                </Box>
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
                <FormInput
                  name="country"
                  label="Country"
                  placeholder="Country"
                />
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
                        option.value as "pending" | "paid"
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
