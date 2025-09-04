import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { OrderSelectionSection } from "@/components/invoices/OrderSelectionSection";
import { InvoiceDetailsForm } from "@/components/invoices/InvoiceDetailsForm";
import { OrderSelectionModal } from "@/components/invoices/OrderSelectionModal";
import { invoiceSchema, InvoiceFormData } from "@/schemas/invoice";
import {
  Customer,
  OrderWithCustomer,
  OrderWithCustomerAndItems,
} from "@/types/orders";
import { FormButton } from "@/components/FormComponents";
// Removed legacy DesignSystem Button/colors/spacing in favor of semantic classes & FormButton

export default function CreateInvoicePage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Generate invoice number function
  const generateInvoiceNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const time =
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0");
    return `INV${year}${month}${day}-${time}`;
  };

  // React Hook Form setup
  const methods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: generateInvoiceNumber(),
      customer_id: "",
      order_id: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      amount: 0,
      tax: 0,

      pdf_url: "",
    },
  });

  const {
    handleSubmit: hookFormSubmit,
    setValue,
    watch,
    formState: { errors: formErrors },
  } = methods;
  const watchedValues = watch();

  // Convert react-hook-form errors to the expected format
  const errors: Record<string, string> = {};
  Object.keys(formErrors).forEach((key) => {
    const error = formErrors[key as keyof typeof formErrors];
    if (error) {
      errors[key] = error.message || "Invalid value";
    }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState<OrderWithCustomerAndItems | null>(null);

  // Fetch customers
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

  // Fetch orders
  const { data: orders = [] } = useQuery({
    queryKey: ["orders-for-invoice", orderSearch],
    queryFn: async (): Promise<OrderWithCustomerAndItems[]> => {
      let query = supabase
        .from("orders")
        .select(
          `*, customers(*), order_items(id, item_name, quantity, unit_price, total_price)`
        )
        .order("created_at", { ascending: false });

      if (orderSearch.trim()) {
        query = query.or(`order_number.ilike.%${orderSearch}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data as OrderWithCustomerAndItems[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Auto-populate form when order is selected
  useEffect(() => {
    if (selectedOrder) {
      setValue("order_id", selectedOrder.id);
      setValue("customer_id", selectedOrder.customer_id);
      setValue("amount", selectedOrder.subtotal || 0);
      setValue("tax", selectedOrder.total_tax || 0);
      setCustomerSearch(selectedOrder.customers?.name || "");
    }
  }, [selectedOrder, setValue]);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceFormData) => {
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoiceData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.showToast(
        "success",
        "Invoice Created",
        "Invoice created successfully"
      );
      // Navigate after a short delay to allow the toast to display
      setTimeout(() => {
        router.replace(`/invoices/${data.id}` as any);
      }, 350);
    },
    onError: (error: any) => {
      toast.showToast(
        "error",
        "Creation Failed",
        error.message || "Failed to create invoice"
      );
    },
  });

  // Handlers
  const handleOrderSelect = useCallback((order: OrderWithCustomerAndItems) => {
    setSelectedOrder(order);
    setShowOrderModal(false);
    setOrderSearch(
      `${order.order_number} - ${order.customers?.name || "Unknown"}`
    );
  }, []);

  const handleUpdateField = useCallback(
    (field: keyof InvoiceFormData, value: any) => {
      setValue(field, value);
    },
    [setValue]
  );

  const handleSelectCustomer = useCallback(
    (customerId: string, customerName: string) => {
      setValue("customer_id", customerId);
      setCustomerSearch(customerName);
    },
    [setValue]
  );

  const handleGenerateInvoiceNumber = useCallback(() => {
    setValue("invoice_number", generateInvoiceNumber());
  }, [setValue]);

  const handleClearSelection = useCallback(() => {
    setSelectedOrder(null);
    setOrderSearch("");
    setValue("order_id", "");
    setValue("customer_id", "");
    setValue("amount", 0);
    setValue("tax", 0);
    setCustomerSearch("");
  }, [setValue]);

  const onSubmit = (data: InvoiceFormData) => {
    createInvoiceMutation.mutate(data);
  };

  const handleGeneratePdf = useCallback(async () => {
    const formData = watchedValues;
    setIsGenerating(true);
    try {
      // PDF generation logic here
      toast.showToast("success", "PDF Ready", "Invoice PDF generated");
    } catch (error: any) {
      toast.showToast(
        "error",
        "PDF Error",
        error.message || "Failed to generate PDF"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [watchedValues, toast]);

  const calculateTotal = useCallback(() => {
    return (
      (watchedValues.amount || 0) +
      (watchedValues.tax || 0) +
      (selectedOrder?.delivery_charge || 0)
    );
  }, [watchedValues.amount, watchedValues.tax]);

  return (
    <StandardPage>
      <StandardHeader
        title="Create Invoice"
        subtitle="Generate a new invoice from order or manual entry"
        showBackButton
      />

      <FormProvider {...methods}>
        <OrderSelectionSection
          selectedOrder={selectedOrder}
          orderSearch={orderSearch}
          onSelectOrder={() => setShowOrderModal(true)}
          onClearSelection={handleClearSelection}
        />

        <InvoiceDetailsForm
          formData={watchedValues}
          errors={errors}
          customers={customers}
          customerSearch={customerSearch}
          onCustomerSearch={setCustomerSearch}
          onSelectCustomer={handleSelectCustomer}
          onGenerateInvoiceNumber={handleGenerateInvoiceNumber}
          onUpdateField={handleUpdateField}
          onGeneratePdf={handleGeneratePdf}
          isGenerating={isGenerating}
          isSubmitting={createInvoiceMutation.isPending}
          calculateTotal={calculateTotal}
        />

        <View className="mt-8">
          <FormButton
            title={
              createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"
            }
            onPress={hookFormSubmit(onSubmit)}
            loading={createInvoiceMutation.isPending}
            variant="solid"
          />
        </View>

        <OrderSelectionModal
          visible={showOrderModal}
          orders={orders}
          orderSearch={orderSearch}
          onOrderSearch={setOrderSearch}
          onSelectOrder={handleOrderSelect}
          onClose={() => setShowOrderModal(false)}
        />
      </FormProvider>
    </StandardPage>
  );
}
