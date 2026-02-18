import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Modal, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { generateAndUploadInvoicePdf, sharePdf } from "@/lib/invoicePdf";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import { useToastHelpers } from "@/lib/toast";
// Replaced legacy DesignSystem components with Gluestack primitives & layout
import { Card } from "@/components/ui/card";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import {
  FormInput,
  FormButton,
  FormSection,
} from "@/components/FormComponents";
// Removed legacy Page layout
import SearchBar from "@/components/SearchBar";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { InvoiceFormData } from "@/schemas/invoice";
import { InvoiceWithRelations } from "@/types/invoice";
import { OrderWithCustomerAndItems } from "@/types/orders";
import {
  useInvoiceDetails,
  useUpdateInvoiceMutation,
  useInvoiceCustomers,
  useOrdersForInvoice,
} from "@/hooks/useInvoices";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Input, InputField } from "@/components/ui/input";
import { formatDate, parseDate, toISODateStringLocal } from "@/lib/date";

export default function EditInvoicePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showError, showInfo } = useToastHelpers();

  // React Hook Form
  const methods = useForm<InvoiceFormData>({
    defaultValues: {
      invoice_number: "",
      customer_id: "",
      order_id: "",
      issue_date: "",
      due_date: "",
      amount: 0,
      tax: 0,
      delivery_charge: 0,
    },
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = methods;

  const [isGenerating, setIsGenerating] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState<OrderWithCustomerAndItems | null>(null);
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Watch form values
  const formValues = watch();

  // Fetch current invoice
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoiceDetails(id);

  // Initialize form data when invoice is loaded
  useEffect(() => {
    if (invoice) {
      setValue("invoice_number", invoice.invoice_number);
      setValue("customer_id", invoice.customer_id);
      setValue("order_id", invoice.order_id || "");
      setValue("issue_date", invoice.issue_date);
      setValue("due_date", invoice.due_date);
      setValue("amount", invoice.amount);
      setValue("tax", invoice.tax);
      setValue("delivery_charge", invoice.delivery_charge || 0);

      // Set customer search to show current customer name
      if (invoice.customers) {
        setCustomerSearch(invoice.customers.name);
      }

      // Set order search if order exists
      if (invoice.orders) {
        setOrderSearch(
          `${invoice.orders.order_number} - ${
            invoice.customers?.name || "Unknown"
          }`,
        );
      }
    }
  }, [invoice, setValue]);

  // Fetch customers for selection
  const { data: customers = [] } = useInvoiceCustomers(customerSearch);

  // Fetch orders for selection
  const { data: orders = [] } = useOrdersForInvoice(orderSearch);

  const handleOrderSelect = (order: OrderWithCustomerAndItems) => {
    setSelectedOrder(order);
    setShowOrderModal(false);
    setOrderSearch(
      `${order.order_number} - ${order.customers?.name || "Unknown"}`,
    );

    // Update form data with order details
    setValue("order_id", order.id);
    setValue("customer_id", order.customer_id);
    setValue("amount", order.subtotal || 0);
    setValue("tax", order.total_tax || 0);
    setValue("delivery_charge", order.delivery_charge || 0);

    // Set customer search to show selected customer name
    if (order.customers) {
      setCustomerSearch(order.customers.name);
    }
  };

  const updateInvoiceMutation = useUpdateInvoiceMutation(id);

  const onSubmit = (data: InvoiceFormData) => {
    updateInvoiceMutation.mutate(data, {
      onSuccess: () => {
        showSuccess("Success", "Invoice updated successfully");
        router.back();
      },
      onError: (error: any) => {
        showError("Error", error?.message || "Failed to update invoice");
      },
    });
  };

  const handleGeneratePdf = async () => {
    try {
      if (!invoice) return;

      setIsGenerating(true);
      showInfo("Generating PDF...", "Please wait");

      // Generate PDF using the latest edited form values where available
      const invoiceForPdf = {
        id: invoice.id,
        order_id: formValues.order_id || invoice.order_id || "",
        invoice_number: formValues.invoice_number || invoice.invoice_number,
        issue_date: formValues.issue_date || invoice.issue_date,
        due_date: formValues.due_date || invoice.due_date || "",
        amount: formValues.amount ?? invoice.amount,
        tax: formValues.tax ?? invoice.tax,
        delivery_charge:
          formValues.delivery_charge ?? (invoice.delivery_charge || 0),
        pdf_url: invoice.pdf_url || "",
        created_at: invoice.created_at,
        updated_at: new Date().toISOString(),
        customer_id: formValues.customer_id || invoice.customer_id,
        notes: null,
        customers: invoice.customers,
        orders: invoice.orders,
      };

      const { filePath, storagePath } = await generateAndUploadInvoicePdf({
        invoice: invoiceForPdf as any,
        customer: invoice.customers,
        orderItems: [],
        logo: require("@/assets/images/icon.png"),
        filename: `invoice_${invoice.invoice_number}.pdf`,
        bucket: INVOICE_PDF_BUCKET,
      });

      // Update invoice with PDF URL via service (using storage path as before)
      const { updateInvoicePdfUrl } =
        await import("@/services/invoice.service");
      await updateInvoicePdfUrl(invoice.id, storagePath);

      showSuccess("PDF Generated", "Invoice PDF has been generated.");

      // Share the PDF
      await sharePdf(filePath);
    } catch (error: any) {
      console.error("PDF generation error:", error);
      showError("Error", error.message || "Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingInvoice) {
    return (
      <StandardPage>
        <StandardHeader title="Edit Invoice" showBackButton />
        <VStack className="items-center justify-center py-20">
          <Text className="text-sm text-typography-600">
            Loading invoice...
          </Text>
        </VStack>
      </StandardPage>
    );
  }

  if (!invoice) {
    return (
      <StandardPage>
        <StandardHeader title="Edit Invoice" showBackButton />
        <VStack className="items-center justify-center py-20">
          <Text className="text-sm font-medium text-error-600">
            Invoice not found
          </Text>
        </VStack>
      </StandardPage>
    );
  }

  return (
    <FormProvider {...methods}>
      <StandardPage>
        <StandardHeader title="Edit Invoice" showBackButton />
        <VStack className="gap-6 pb-8">
          {/* Invoice Header */}
          <Card className="p-5">
            <Text className="text-lg font-semibold text-typography-900 mb-3">
              Invoice Details
            </Text>
            <FormSection title="Basic Information">
              <FormInput
                name="invoice_number"
                label="Invoice Number"
                placeholder="Invoice number (from order)"
                disabled
                rules={{ required: "Invoice number is required" }}
              />
              <HStack className="gap-4 mt-2">
                <Box className="flex-1">
                  <Controller
                    control={control}
                    name="issue_date"
                    rules={{ required: "Issue date is required" }}
                    render={({ field: { value, onChange } }) => (
                      <View>
                        <Text className="text-sm font-semibold text-typography-700 mb-1">
                          Issue Date <Text className="text-error-500">*</Text>
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setShowIssueDatePicker(true)}
                        >
                          <Input variant="outline" size="md" isReadOnly>
                            <InputField
                              value={formatDate(value)}
                              editable={false}
                              placeholder="DD/MM/YYYY"
                              className="flex-1 text-typography-900 py-0 pl-4 pr-4"
                            />
                          </Input>
                        </TouchableOpacity>
                        {errors.issue_date && (
                          <Text className="text-xs text-error-600 mt-1">
                            {errors.issue_date.message}
                          </Text>
                        )}
                        {showIssueDatePicker && (
                          <DateTimePicker
                            mode="date"
                            display={
                              Platform.OS === "ios" ? "spinner" : "default"
                            }
                            value={parseDate(value) ?? new Date()}
                            onChange={(_, date) => {
                              if (Platform.OS !== "ios") {
                                setShowIssueDatePicker(false);
                              }
                              if (date) {
                                onChange(toISODateStringLocal(date));
                              }
                            }}
                          />
                        )}
                      </View>
                    )}
                  />
                </Box>
                <Box className="flex-1">
                  <Controller
                    control={control}
                    name="due_date"
                    render={({ field: { value, onChange } }) => (
                      <View>
                        <Text className="text-sm font-semibold text-typography-700 mb-1">
                          Due Date
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setShowDueDatePicker(true)}
                        >
                          <Input variant="outline" size="md" isReadOnly>
                            <InputField
                              value={formatDate(value)}
                              editable={false}
                              placeholder="DD/MM/YYYY"
                              className="flex-1 text-typography-900 py-0 pl-4 pr-4"
                            />
                          </Input>
                        </TouchableOpacity>
                        {errors.due_date && (
                          <Text className="text-xs text-error-600 mt-1">
                            {errors.due_date.message}
                          </Text>
                        )}
                        {showDueDatePicker && (
                          <DateTimePicker
                            mode="date"
                            display={
                              Platform.OS === "ios" ? "spinner" : "default"
                            }
                            value={parseDate(value) ?? new Date()}
                            onChange={(_, date) => {
                              if (Platform.OS !== "ios") {
                                setShowDueDatePicker(false);
                              }
                              if (date) {
                                onChange(toISODateStringLocal(date));
                              }
                            }}
                          />
                        )}
                      </View>
                    )}
                  />
                </Box>
              </HStack>
            </FormSection>
          </Card>

          {/* Customer Selection */}
          <Card className="p-5">
            <FormSection title="Customer Information">
              <VStack>
                <Text className="text-sm font-medium text-typography-700 mb-2">
                  Select Customer
                </Text>
                <SearchBar
                  placeholder="Search customers by name or email..."
                  value={customerSearch}
                  onChange={setCustomerSearch}
                />
                {customerSearch && customers.length > 0 && (
                  <VStack className="max-h-52 bg-background-0 border border-outline-200 rounded-lg mt-1 overflow-hidden">
                    <VStack className="">
                      {customers.map((customer) => (
                        <TouchableOpacity
                          key={customer.id}
                          onPress={() => {
                            setValue("customer_id", customer.id);
                            setCustomerSearch(customer.name);
                          }}
                          className={`px-4 py-3 border-b border-outline-100 ${
                            formValues.customer_id === customer.id
                              ? "bg-primary-50"
                              : "bg-background-0"
                          }`}
                        >
                          <Text className="text-sm font-semibold text-typography-900">
                            {customer.name || "Unknown Customer"}
                          </Text>
                          <Text className="text-xs text-typography-600 mt-0.5">
                            {customer.email || "No email"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </VStack>
                  </VStack>
                )}
                {errors.customer_id && (
                  <Text className="text-xs text-error-600 mt-1">
                    {errors.customer_id.message}
                  </Text>
                )}
              </VStack>
            </FormSection>
          </Card>

          {/* Order Selection */}
          <Card className="p-5">
            <FormSection title="Order Information (Optional)">
              <Text className="text-sm font-medium text-typography-700 mb-2">
                Linked Order
              </Text>
              <TouchableOpacity
                onPress={() => setShowOrderModal(true)}
                className="flex-row items-center justify-between bg-background-100 border border-outline-200 rounded-lg px-4 py-3 min-h-[52px]"
              >
                <Text
                  className={`text-sm flex-1 ${
                    selectedOrder || formValues.order_id
                      ? "text-typography-900"
                      : "text-typography-400"
                  }`}
                >
                  {selectedOrder
                    ? `${selectedOrder.order_number} - ₹${
                        selectedOrder.total_amount?.toLocaleString() || "0"
                      }`
                    : formValues.order_id
                      ? orderSearch || "Order linked"
                      : "Tap to select an order (optional)"}
                </Text>
                <FontAwesome
                  name="chevron-down"
                  size={16}
                  color="rgb(var(--color-typography-500))"
                />
              </TouchableOpacity>
              {(selectedOrder || formValues.order_id) && (
                <VStack className="bg-primary-50 rounded-lg p-3 mt-2">
                  <Text className="text-xs font-semibold text-primary-900 mb-1">
                    Order: {selectedOrder?.order_number || "Current order"}
                  </Text>
                  {selectedOrder && (
                    <>
                      <Text className="text-[11px] text-primary-700">
                        Customer:{" "}
                        {selectedOrder.customers?.name || "Unknown Customer"}
                      </Text>
                      <Text className="text-[11px] text-primary-700">
                        Total: ₹
                        {selectedOrder.total_amount?.toLocaleString() || "0"}
                      </Text>
                    </>
                  )}
                </VStack>
              )}
            </FormSection>
          </Card>

          {/* Financial Information */}
          <Card className="p-5">
            <FormSection title="Financial Details">
              <HStack className="gap-4">
                <Box className="flex-1">
                  <FormInput
                    name="amount"
                    label="Amount"
                    placeholder="0.00"
                    keyboardType="numeric"
                    rules={{
                      required: "Amount is required",
                      min: { value: 0, message: "Amount must be positive" },
                    }}
                  />
                </Box>
                <Box className="flex-1">
                  <FormInput
                    name="tax"
                    label="Tax"
                    placeholder="0.00"
                    keyboardType="numeric"
                    rules={{
                      min: { value: 0, message: "Tax must be positive" },
                    }}
                  />
                </Box>
              </HStack>
              <Box className="mt-3">
                <FormInput
                  name="delivery_charge"
                  label="Delivery Charge"
                  placeholder="0.00"
                  keyboardType="numeric"
                  rules={{
                    min: {
                      value: 0,
                      message: "Delivery charge must be positive",
                    },
                  }}
                />
              </Box>
              <Box className="bg-background-100 rounded-lg p-3 mt-3">
                <Text className="text-base font-semibold text-typography-900">
                  Total: ₹
                  {(
                    (formValues.amount || 0) +
                    (formValues.tax || 0) +
                    (formValues.delivery_charge || 0)
                  ).toLocaleString()}
                </Text>
              </Box>
            </FormSection>
          </Card>

          {/* Action Buttons */}
          <VStack className="gap-3 mb-8">
            <FormButton
              title="Update Invoice"
              onPress={handleSubmit(onSubmit as any)}
              loading={isSubmitting || updateInvoiceMutation.isPending}
              variant="solid"
            />
            <FormButton
              title="Generate PDF"
              onPress={handleGeneratePdf}
              loading={isGenerating}
              variant="outline"
            />
          </VStack>
        </VStack>

        {/* Order Selection Modal */}
        <Modal
          visible={showOrderModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <Box className="flex-1 bg-background-0">
            <HStack className="items-center justify-between px-5 py-4 border-b border-outline-200">
              <Text className="text-lg font-semibold text-typography-900">
                Select Order
              </Text>
              <TouchableOpacity
                onPress={() => setShowOrderModal(false)}
                className="bg-background-100 rounded-md p-2"
              >
                <FontAwesome
                  name="times"
                  size={16}
                  color="rgb(var(--color-typography-600))"
                />
              </TouchableOpacity>
            </HStack>
            <Box className="px-5 py-4">
              <SearchBar
                placeholder="Search orders..."
                value={orderSearch}
                onChange={setOrderSearch}
              />
            </Box>
            <VStack className="flex-1 px-5">
              {orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => handleOrderSelect(order)}
                  className="bg-background-0 border border-outline-200 rounded-xl p-4 mb-3"
                >
                  <HStack className="justify-between items-start mb-2">
                    <VStack className="flex-1 mr-3">
                      <Text className="text-sm font-semibold text-typography-900 mb-1">
                        {order.order_number}
                      </Text>
                      <Text className="text-xs text-typography-600 mb-1">
                        {order.customers?.name || "Unknown Customer"}
                      </Text>
                      <Text className="text-[11px] text-typography-500">
                        Date: {formatDate(order.order_date || order.created_at)}
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="text-base font-semibold text-primary-600 mb-1">
                        ₹{order.total_amount?.toLocaleString() || "0"}
                      </Text>
                      <Box className="bg-success-100 px-2 py-1 rounded">
                        <Text className="text-[10px] font-medium text-success-700">
                          {order.order_status?.toUpperCase() || "UNKNOWN"}
                        </Text>
                      </Box>
                    </VStack>
                  </HStack>
                  {order.order_items && order.order_items.length > 0 && (
                    <VStack className="pt-2 border-t border-outline-100">
                      <Text className="text-[11px] text-typography-500 mb-1">
                        Items: {order.order_items.length}
                      </Text>
                      <Text
                        className="text-[11px] text-typography-400"
                        numberOfLines={1}
                      >
                        {order.order_items
                          .map((item) => item.item_name || "Unknown Item")
                          .join(", ")}
                      </Text>
                    </VStack>
                  )}
                </TouchableOpacity>
              ))}
            </VStack>
          </Box>
        </Modal>
      </StandardPage>
    </FormProvider>
  );
}
