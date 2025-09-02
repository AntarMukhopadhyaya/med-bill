import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  Text,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import {
  generateInvoicePdf,
  writePdfToFile,
  uploadPdfToSupabase,
  sharePdf,
} from "@/lib/invoicePdf";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import { useToast, useToastHelpers } from "@/lib/toast";
import {
  Card,
  Button,
  colors,
  spacing,
  SafeScreen,
  Header,
} from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
  FormSelect,
  FormContainer,
} from "@/components/FormComponents";
import Page from "@/components/Page";
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
  pdf_url: string | null;
  customers: Customer;
  orders: Order | null;
}

interface InvoiceFormData {
  invoice_number: string;
  customer_id: string;
  order_id: string;
  issue_date: string;
  due_date: string;
  amount: number;
  tax: number;
  status: string;
  pdf_url: string;
}

export default function EditInvoicePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
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
      status: "draft",
      pdf_url: "",
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
      setValue("status", invoice.status);
      setValue("pdf_url", invoice.pdf_url || "");

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

    // Set customer search to show selected customer name
    if (order.customers) {
      setCustomerSearch(order.customers.name);
    }
  };

  const updateInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceFormData) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(invoiceData)
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
      Alert.alert("Error", error.message || "Failed to update invoice");
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
        status: invoice.status,
        pdf_url: invoice.pdf_url || "",
        created_at: invoice.created_at,
        updated_at: new Date().toISOString(),
        customer_id: invoice.customer_id,
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
      <SafeScreen>
        <Header title="Edit Invoice" onBack={() => router.back()} />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: spacing[4],
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: colors.gray[600],
            }}
          >
            Loading invoice...
          </Text>
        </View>
      </SafeScreen>
    );
  }

  if (!invoice) {
    return (
      <SafeScreen>
        <Header title="Edit Invoice" onBack={() => router.back()} />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: spacing[4],
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: colors.error[600],
            }}
          >
            Invoice not found
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <FormProvider {...methods}>
      <SafeScreen>
        <Header title="Edit Invoice" onBack={() => router.back()} />

        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: spacing[4] }}>
            {/* Invoice Header */}
            <Card style={{ marginBottom: spacing[4] }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.gray[900],
                  marginBottom: spacing[2],
                }}
              >
                Invoice Details
              </Text>

              <FormSection title="Basic Information">
                <FormInput
                  name="invoice_number"
                  label="Invoice Number"
                  placeholder="Enter invoice number"
                  rules={{ required: "Invoice number is required" }}
                />

                <View style={{ flexDirection: "row", gap: spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      name="issue_date"
                      label="Issue Date"
                      placeholder="YYYY-MM-DD"
                      rules={{ required: "Issue date is required" }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      name="due_date"
                      label="Due Date"
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                <Controller
                  name="status"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "500",
                          color: colors.gray[700],
                          marginBottom: spacing[2],
                        }}
                      >
                        Status
                      </Text>
                      <View style={{ flexDirection: "row", gap: spacing[2] }}>
                        {["draft", "sent", "paid", "overdue"].map((status) => (
                          <TouchableOpacity
                            key={status}
                            style={{
                              paddingHorizontal: spacing[3],
                              paddingVertical: spacing[2],
                              borderRadius: 8,
                              backgroundColor:
                                value === status
                                  ? colors.primary[500]
                                  : colors.gray[100],
                              borderWidth: 1,
                              borderColor:
                                value === status
                                  ? colors.primary[500]
                                  : colors.gray[200],
                            }}
                            onPress={() => onChange(status)}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color:
                                  value === status
                                    ? colors.white
                                    : colors.gray[600],
                                textTransform: "capitalize",
                              }}
                            >
                              {status}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                />
              </FormSection>
            </Card>

            {/* Customer Selection */}
            <Card style={{ marginBottom: spacing[4] }}>
              <FormSection title="Customer Information">
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: colors.gray[700],
                      marginBottom: spacing[2],
                    }}
                  >
                    Select Customer
                  </Text>
                  <SearchBar
                    placeholder="Search customers by name or email..."
                    value={customerSearch}
                    onChange={setCustomerSearch}
                  />

                  {customerSearch && customers.length > 0 && (
                    <View
                      style={{
                        maxHeight: 200,
                        backgroundColor: colors.white,
                        borderWidth: 1,
                        borderColor: colors.gray[200],
                        borderRadius: 8,
                        marginTop: spacing[1],
                      }}
                    >
                      <ScrollView>
                        {customers.map((customer) => (
                          <TouchableOpacity
                            key={customer.id}
                            style={{
                              padding: spacing[3],
                              borderBottomWidth: 1,
                              borderBottomColor: colors.gray[100],
                              backgroundColor:
                                formValues.customer_id === customer.id
                                  ? colors.primary[50]
                                  : colors.white,
                            }}
                            onPress={() => {
                              setValue("customer_id", customer.id);
                              setCustomerSearch(customer.name);
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "500",
                                color: colors.gray[900],
                              }}
                            >
                              {customer.name || "Unknown Customer"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 14,
                                color: colors.gray[600],
                              }}
                            >
                              {customer.email || "No email"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {errors.customer_id && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.error[600],
                        marginTop: spacing[1],
                      }}
                    >
                      {errors.customer_id.message}
                    </Text>
                  )}
                </View>
              </FormSection>
            </Card>

            {/* Order Selection */}
            <Card style={{ marginBottom: spacing[4] }}>
              <FormSection title="Order Information (Optional)">
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: colors.gray[700],
                    marginBottom: spacing[2],
                  }}
                >
                  Linked Order
                </Text>

                <TouchableOpacity
                  onPress={() => setShowOrderModal(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: colors.gray[50],
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    borderRadius: 8,
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    minHeight: 52,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color:
                        selectedOrder || formValues.order_id
                          ? colors.gray[900]
                          : colors.gray[400],
                      flex: 1,
                    }}
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
                    color={colors.gray[500]}
                  />
                </TouchableOpacity>

                {(selectedOrder || formValues.order_id) && (
                  <View
                    style={{
                      backgroundColor: colors.primary[50],
                      borderRadius: 8,
                      padding: spacing[3],
                      marginTop: spacing[2],
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.primary[900],
                        marginBottom: spacing[1],
                      }}
                    >
                      Order: {selectedOrder?.order_number || "Current order"}
                    </Text>
                    {selectedOrder && (
                      <>
                        <Text
                          style={{ fontSize: 12, color: colors.primary[700] }}
                        >
                          Customer:{" "}
                          {selectedOrder.customers?.name || "Unknown Customer"}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: colors.primary[700] }}
                        >
                          Total: ₹
                          {selectedOrder.total_amount?.toLocaleString() || "0"}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </FormSection>
            </Card>

            {/* Financial Information */}
            <Card style={{ marginBottom: spacing[4] }}>
              <FormSection title="Financial Details">
                <View style={{ flexDirection: "row", gap: spacing[3] }}>
                  <View style={{ flex: 1 }}>
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
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      name="tax"
                      label="Tax"
                      placeholder="0.00"
                      keyboardType="numeric"
                      rules={{
                        min: { value: 0, message: "Tax must be positive" },
                      }}
                    />
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: colors.gray[50],
                    padding: spacing[3],
                    borderRadius: 8,
                    marginTop: spacing[2],
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: colors.gray[900],
                    }}
                  >
                    Total: ₹
                    {(formValues.amount + formValues.tax).toLocaleString()}
                  </Text>
                </View>
              </FormSection>
            </Card>

            {/* Action Buttons */}
            <View style={{ gap: spacing[3], marginBottom: spacing[6] }}>
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
            </View>
          </View>
        </ScrollView>

        {/* Order Selection Modal */}
        <Modal
          visible={showOrderModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={{ flex: 1, backgroundColor: colors.white }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing[4],
                borderBottomWidth: 1,
                borderBottomColor: colors.gray[200],
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                Select Order
              </Text>
              <TouchableOpacity
                onPress={() => setShowOrderModal(false)}
                style={{
                  padding: spacing[2],
                  borderRadius: 8,
                  backgroundColor: colors.gray[100],
                }}
              >
                <FontAwesome name="times" size={16} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: spacing[4] }}>
              <SearchBar
                placeholder="Search orders..."
                value={orderSearch}
                onChange={setOrderSearch}
              />
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: spacing[4] }}>
              {orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={{
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    borderRadius: 12,
                    padding: spacing[4],
                    marginBottom: spacing[3],
                  }}
                  onPress={() => handleOrderSelect(order)}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: spacing[2],
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: colors.gray[900],
                          marginBottom: spacing[1],
                        }}
                      >
                        {order.order_number}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.gray[600],
                          marginBottom: spacing[1],
                        }}
                      >
                        {order.customers?.name || "Unknown Customer"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.gray[500],
                        }}
                      >
                        Date:{" "}
                        {new Date(
                          order.order_date || order.created_at
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "600",
                          color: colors.primary[600],
                          marginBottom: spacing[1],
                        }}
                      >
                        ₹{order.total_amount?.toLocaleString() || "0"}
                      </Text>
                      <View
                        style={{
                          backgroundColor: colors.success[100],
                          paddingHorizontal: spacing[2],
                          paddingVertical: spacing[1],
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "500",
                            color: colors.success[700],
                          }}
                        >
                          {order.order_status?.toUpperCase() || "UNKNOWN"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Order Items Preview */}
                  {order.order_items && order.order_items.length > 0 && (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: colors.gray[100],
                        paddingTop: spacing[2],
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.gray[500],
                          marginBottom: spacing[1],
                        }}
                      >
                        Items: {order.order_items.length}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.gray[400],
                        }}
                        numberOfLines={1}
                      >
                        {order.order_items
                          .map((item) => item.item_name || "Unknown Item")
                          .join(", ")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </SafeScreen>
    </FormProvider>
  );
}
