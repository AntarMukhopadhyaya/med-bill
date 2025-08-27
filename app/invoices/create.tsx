import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  generateInvoicePdf,
  writePdfToFile,
  uploadPdfToSupabase,
  sharePdf,
} from "@/lib/invoicePdf";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import { useToast } from "@/lib/toast";
import { Card, Button, colors, spacing } from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
} from "@/components/FormComponents";
import Page from "@/components/Page";
import SearchBar from "@/components/SearchBar";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

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

export default function CreateInvoicePage() {
  const queryClient = useQueryClient();

  // Generate a shorter, more readable invoice number
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2); // Last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const time =
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0");
    return `INV${year}${month}${day}-${time}`;
  };

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: generateInvoiceNumber(),
    customer_id: "",
    order_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    amount: 0,
    tax: 0,
    status: "draft",
    pdf_url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();
  const [customerSearch, setCustomerSearch] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(
    null
  );

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

  // Auto-populate form when order is selected
  useEffect(() => {
    if (selectedOrder) {
      setFormData((prev) => ({
        ...prev,
        order_id: selectedOrder.id,
        customer_id: selectedOrder.customer_id,
        amount: selectedOrder.subtotal || 0,
        tax: selectedOrder.total_tax || 0,
      }));

      // Set customer search to show selected customer name
      if (selectedOrder.customers) {
        setCustomerSearch(selectedOrder.customers.name);
      }
    }
  }, [selectedOrder]);

  const handleOrderSelect = (order: OrderWithCustomer) => {
    setSelectedOrder(order);
    setShowOrderModal(false);
    setOrderSearch(
      `${order.order_number} - ${order.customers?.name || "Unknown"}`
    );
  };
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      Alert.alert("Success", "Invoice created successfully", [
        {
          text: "OK",
          onPress: () => router.replace(`/invoices/${data.id}` as any),
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to create invoice");
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = "Customer is required";
    }
    if (!formData.issue_date) {
      newErrors.issue_date = "Issue date is required";
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }
    // pdf_url now optional until generated

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    createInvoiceMutation.mutate(formData);
  };

  const handleGeneratePdf = async () => {
    try {
      if (!validateForm()) return;
      setIsGenerating(true);
      toast.showToast({
        type: "info",
        title: "Generating PDF...",
        message: "Please wait",
      });
      // Ensure record exists first
      let invoiceId: string | null = null;
      if (!formData.pdf_url) {
        // Create draft if not created
        // @ts-ignore temporary until types updated
        const { data, error } = await (supabase as any)
          .from("invoices")
          .insert({
            invoice_number: formData.invoice_number,
            customer_id: formData.customer_id,
            order_id: formData.order_id || null,
            issue_date: formData.issue_date,
            due_date: formData.due_date,
            amount: formData.amount,
            tax: formData.tax,
            status: formData.status,
            pdf_url: "",
          })
          .select()
          .single();
        if (error) throw error;
        invoiceId = (data as any).id;
      }
      const id = invoiceId; // optionally use existing id if created earlier
      // Fetch customer
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", formData.customer_id)
        .single();
      const pdfBytes = await generateInvoicePdf({
        invoice: {
          id: id || "temp",
          order_id: formData.order_id,
          invoice_number: formData.invoice_number,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          amount: formData.amount,
          tax: formData.tax,
          status: formData.status,
          pdf_url: formData.pdf_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customer_id: formData.customer_id,
        } as any,
        customer,
        logo: require("@/assets/images/icon.png"),
      });
      const filePath = await writePdfToFile(
        pdfBytes,
        `${formData.invoice_number}.pdf`
      );
      const { publicUrl } = await uploadPdfToSupabase(
        filePath,
        INVOICE_PDF_BUCKET
      );
      updateFormData("pdf_url", publicUrl || "");
      if (id) {
        // @ts-ignore
        await (supabase as any)
          .from("invoices")
          .update({ pdf_url: publicUrl })
          .eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
      toast.showToast({
        type: "success",
        title: "PDF Ready",
        message: "Invoice PDF generated",
      });
      await sharePdf(filePath);
    } catch (e: any) {
      toast.showToast({
        type: "error",
        title: "PDF Error",
        message: e.message || "Failed to generate PDF",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateFormData = (field: keyof InvoiceFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const calculateTotal = () => {
    const amount = formData.amount || 0;
    const tax = formData.tax || 0;
    return amount + tax;
  };

  return (
    <Page
      title="Create Invoice"
      subtitle="Generate a new invoice from order or manual entry"
      onBack={() => router.back()}
    >
      <FormSection title="Order Selection (Optional)">
        <View style={{ marginBottom: spacing[4] }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.gray[700],
              marginBottom: spacing[2],
            }}
          >
            Select Order (Auto-fills invoice data)
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
                color: selectedOrder ? colors.gray[900] : colors.gray[400],
                flex: 1,
              }}
            >
              {selectedOrder
                ? `${selectedOrder.order_number} - ₹${selectedOrder.total_amount?.toLocaleString()}`
                : "Tap to select an order"}
            </Text>
            <FontAwesome
              name="chevron-down"
              size={16}
              color={colors.gray[500]}
            />
          </TouchableOpacity>
          {selectedOrder && (
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
                Selected Order: {selectedOrder.order_number}
              </Text>
              <Text style={{ fontSize: 12, color: colors.primary[700] }}>
                Customer: {selectedOrder.customers?.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.primary[700] }}>
                Amount: ₹{selectedOrder.subtotal?.toLocaleString()} + Tax: ₹
                {selectedOrder.total_tax?.toLocaleString()}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedOrder(null);
                  setOrderSearch("");
                  setFormData((prev) => ({
                    ...prev,
                    order_id: "",
                    customer_id: "",
                    amount: 0,
                    tax: 0,
                  }));
                  setCustomerSearch("");
                }}
                style={{ marginTop: spacing[2] }}
              >
                <Text style={{ color: colors.primary[600], fontSize: 12 }}>
                  Clear Selection
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </FormSection>

      <FormSection title="Invoice Details">
        <View style={{ marginBottom: spacing[4] }}>
          <FormInput
            label="Invoice Number"
            value={formData.invoice_number}
            onChangeText={(v) => updateFormData("invoice_number", v)}
            error={errors.invoice_number}
          />
          <TouchableOpacity
            onPress={() =>
              updateFormData("invoice_number", generateInvoiceNumber())
            }
            style={{
              marginTop: spacing[2],
              paddingVertical: spacing[1],
              paddingHorizontal: spacing[3],
              backgroundColor: colors.gray[100],
              borderRadius: 6,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                color: colors.primary[600],
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              Generate New Number
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginBottom: spacing[4] }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.gray[700],
              marginBottom: spacing[2],
            }}
          >
            Customer *
          </Text>
          <SearchBar
            value={customerSearch}
            onChange={setCustomerSearch}
            placeholder="Search customers..."
          />
          {customers.length > 0 && (
            <ScrollView
              style={{
                maxHeight: 160,
                marginTop: spacing[2],
                borderWidth: 1,
                borderColor: colors.gray[200],
                borderRadius: 8,
                backgroundColor: colors.white,
              }}
            >
              {customers.map((c) => (
                <Button
                  key={c.id}
                  title={`${c.name}${c.company_name ? ` (${c.company_name})` : ""}`}
                  variant={formData.customer_id === c.id ? "primary" : "ghost"}
                  onPress={() => {
                    updateFormData("customer_id", c.id);
                    setCustomerSearch(c.name);
                  }}
                  style={{ marginBottom: spacing[1] }}
                />
              ))}
            </ScrollView>
          )}
          {errors.customer_id && (
            <Text
              style={{
                color: colors.error[500],
                fontSize: 12,
                marginTop: spacing[1],
              }}
            >
              {errors.customer_id}
            </Text>
          )}
        </View>
        <FormInput
          label="Issue Date"
          value={formData.issue_date}
          onChangeText={(v) => updateFormData("issue_date", v)}
          error={errors.issue_date}
          placeholder="YYYY-MM-DD"
        />
        <FormInput
          label="Due Date"
          value={formData.due_date}
          onChangeText={(v) => updateFormData("due_date", v)}
          error={errors.due_date}
          placeholder="YYYY-MM-DD"
        />
        <FormInput
          label="Amount"
          value={formData.amount.toString()}
          onChangeText={(v) => updateFormData("amount", parseFloat(v) || 0)}
          keyboardType="numeric"
          error={errors.amount}
          placeholder="0.00"
        />
        <FormInput
          label="Tax Amount"
          value={formData.tax.toString()}
          onChangeText={(v) => updateFormData("tax", parseFloat(v) || 0)}
          keyboardType="numeric"
          placeholder="0.00"
        />
        <View
          style={{
            padding: spacing[3],
            backgroundColor: colors.gray[50],
            borderRadius: 8,
            marginBottom: spacing[4],
          }}
        >
          <Text
            style={{ fontSize: 16, fontWeight: "600", color: colors.gray[900] }}
          >
            Total Amount: ₹{calculateTotal().toLocaleString()}
          </Text>
        </View>
        <FormInput
          label="PDF URL"
          value={formData.pdf_url}
          onChangeText={(v) => updateFormData("pdf_url", v)}
          placeholder="Enter PDF URL or file path"
          error={errors.pdf_url}
        />
        <FormButton
          title={isGenerating ? "Generating PDF..." : "Generate & Share PDF"}
          onPress={handleGeneratePdf}
          variant="outline"
          disabled={isGenerating || createInvoiceMutation.isPending}
        />
      </FormSection>
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        <FormButton
          title="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <FormButton
          title={
            createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"
          }
          onPress={handleSubmit}
          disabled={createInvoiceMutation.isPending}
          style={{ flex: 1 }}
        />
      </View>

      {/* Order Selection Modal */}
      <Modal
        visible={showOrderModal}
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
                Select Order
              </Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <FontAwesome name="times" size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <SearchBar
              value={orderSearch}
              onChange={setOrderSearch}
              placeholder="Search orders by number..."
            />
          </View>

          {/* Orders List */}
          <ScrollView style={{ flex: 1, padding: spacing[4] }}>
            {orders.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: spacing[8],
                }}
              >
                <FontAwesome
                  name="file-text-o"
                  size={48}
                  color={colors.gray[400]}
                  style={{ marginBottom: spacing[4] }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.gray[500],
                    textAlign: "center",
                  }}
                >
                  {orderSearch
                    ? "No orders found"
                    : "No delivered orders available for invoicing"}
                </Text>
              </View>
            ) : (
              orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => handleOrderSelect(order)}
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    padding: spacing[4],
                    marginBottom: spacing[3],
                  }}
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
                        ₹{order.total_amount?.toLocaleString()}
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
                          {order.order_status?.toUpperCase()}
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
                          .map((item) => item.item_name)
                          .join(", ")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </Page>
  );
}
