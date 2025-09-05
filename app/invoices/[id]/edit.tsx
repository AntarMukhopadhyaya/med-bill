import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import {
  generateInvoicePdf,
  writePdfToFile,
  uploadPdfToSupabase,
  sharePdf,
} from "@/lib/invoicePdf";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import { useToast, useToastHelpers } from "@/lib/toast";
// Replaced legacy DesignSystem components with Gluestack primitives & layout
import { Card } from "@/components/ui/card";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Badge, BadgeText } from "@/components/ui/badge";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import {
  FormInput,
  FormButton,
  FormSection,
  FormSelect,
  FormContainer,
} from "@/components/FormComponents";
// Removed legacy Page layout
import SearchBar from "@/components/SearchBar";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

interface OrderWithCustomer extends Order {
  customers: Customer;
  order_items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface InvoiceWithRelations {
  id: string;
  created_at: string;
  invoice_number: string;
  customer_id: string;
  order_id: string | null;
  issue_date: string;
  due_date: string;
  status: string;
  amount: number;
  tax: number;
  delivery_charge: number | null;
  pdf_url: string | null;
  customers: Customer;
  orders: Order | null;
}

import { invoiceSchema, InvoiceFormData } from "@/schemas/invoice";

export default function EditInvoicePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToastHelpers();

  // React Hook Form
  const methods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
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
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(
    null
  );

  // Watch form values
  const formValues = watch();

  // Fetch current invoice
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async (): Promise<InvoiceWithRelations> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customers(*),
          orders(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as InvoiceWithRelations;
    },
    enabled: !!id,
  });

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
          }`
        );
      }
    }
  }, [invoice, setValue]);

  // Fetch customers for selection
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: async (): Promise<Customer[]> => {
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
    staleTime: 5 * 60 * 1000,
  });

  // Fetch orders for selection
  const { data: orders = [] } = useQuery({
    queryKey: ["orders-for-invoice", orderSearch],
    queryFn: async (): Promise<OrderWithCustomer[]> => {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          customers(*),
          order_items(
            id,
            item_name,
            quantity,
            unit_price,
            total_price
          )
        `
        )
        .eq("order_status", "delivered") // Only delivered orders can be invoiced
        .order("created_at", { ascending: false });

      if (orderSearch.trim()) {
        query = query.or(`order_number.ilike.%${orderSearch}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data as OrderWithCustomer[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleOrderSelect = (order: OrderWithCustomer) => {
    setSelectedOrder(order);
    setShowOrderModal(false);
    setOrderSearch(
      `${order.order_number} - ${order.customers?.name || "Unknown"}`
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

  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceFormData) => {
      const { data, error } = await supabase
        .from("invoices")
        // @ts-ignore - Supabase generated types not narrowing update payload correctly
        .update({
          invoice_number: invoiceData.invoice_number,
          customer_id: invoiceData.customer_id,
          order_id: invoiceData.order_id || null,
          issue_date: invoiceData.issue_date,
          due_date: invoiceData.due_date,
          amount: invoiceData.amount,
          tax: invoiceData.tax,
          delivery_charge: invoiceData.delivery_charge || 0,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      showSuccess("Success", "Invoice updated successfully");
      router.back();
    },
    onError: (error: any) => {
      showError("Error", error.message || "Failed to update invoice");
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    updateInvoiceMutation.mutate(data);
  };

  const handleGeneratePdf = async () => {
    try {
      if (!invoice) return;

      setIsGenerating(true);
      showInfo("Generating PDF...", "Please wait");

      // Generate PDF with proper structure
      const invoiceForPdf = {
        id: invoice.id,
        order_id: invoice.order_id || "",
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || "",
        amount: invoice.amount,
        tax: invoice.tax,
        delivery_charge: invoice.delivery_charge || 0,
        status: invoice.status,
        pdf_url: invoice.pdf_url || "",
        created_at: invoice.created_at,
        updated_at: new Date().toISOString(),
        customer_id: invoice.customer_id,
        notes: null,
        customers: invoice.customers,
        orders: invoice.orders,
      };

      const pdfBytes = await generateInvoicePdf({
        invoice: invoiceForPdf,
        customer: invoice.customers,
        orderItems: [],
      });
      const pdfUri = await writePdfToFile(
        pdfBytes,
        `invoice_${invoice.invoice_number}.pdf`
      );
      const uploadResult = await uploadPdfToSupabase(
        pdfUri,
        INVOICE_PDF_BUCKET
      );

      // Update invoice with PDF URL
      await supabase
        .from("invoices")
        // @ts-ignore - narrow update typing workaround
        .update({ pdf_url: uploadResult.storagePath })
        .eq("id", invoice.id);

      queryClient.invalidateQueries({ queryKey: ["invoice", id] });

      showSuccess("PDF Generated", "Invoice PDF has been generated.");

      // Share the PDF
      await sharePdf(pdfUri);
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
                placeholder="Enter invoice number"
                rules={{ required: "Invoice number is required" }}
              />
              <HStack className="gap-4 mt-2">
                <Box className="flex-1">
                  <FormInput
                    name="issue_date"
                    label="Issue Date"
                    placeholder="YYYY-MM-DD"
                    rules={{ required: "Issue date is required" }}
                  />
                </Box>
                <Box className="flex-1">
                  <FormInput
                    name="due_date"
                    label="Due Date"
                    placeholder="YYYY-MM-DD"
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
              onPress={handleSubmit(onSubmit)}
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
                        Date:{" "}
                        {new Date(
                          order.order_date || order.created_at
                        ).toLocaleDateString()}
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
