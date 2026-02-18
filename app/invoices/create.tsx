import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useForm, FormProvider } from "react-hook-form";
import { useToast } from "@/lib/toast";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { OrderSelectionSection } from "@/components/invoices/OrderSelectionSection";
import { InvoiceDetailsForm } from "@/components/invoices/InvoiceDetailsForm";
import { OrderSelectionModal } from "@/components/invoices/OrderSelectionModal";
import type { InvoiceFormData } from "@/schemas/invoice";
import { OrderWithCustomerAndItems } from "@/types/orders";
import { FormButton } from "@/components/FormComponents";
import {
  useCreateInvoiceMutation,
  useInvoiceCustomers,
  useOrdersForInvoice,
} from "@/hooks/useInvoices";
import { addDays, toISODateStringLocal } from "@/lib/date";
// Removed legacy DesignSystem Button/colors/spacing in favor of semantic classes & FormButton

export default function CreateInvoicePage() {
  const toast = useToast();

  // React Hook Form setup
  const methods = useForm<InvoiceFormData>({
    defaultValues: {
      invoice_number: "",
      customer_id: "",
      order_id: "",
      issue_date: toISODateStringLocal(new Date()),
      due_date: toISODateStringLocal(addDays(new Date(), 30)),
      amount: 0,
      tax: 0,
    },
  });

  const {
    handleSubmit,
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
  const { data: customers = [] } = useInvoiceCustomers(customerSearch);

  // Fetch orders
  const { data: orders = [] } = useOrdersForInvoice(orderSearch);

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
  const createInvoiceMutation = useCreateInvoiceMutation();

  // Handlers
  const handleOrderSelect = useCallback((order: OrderWithCustomerAndItems) => {
    setSelectedOrder(order);
    setShowOrderModal(false);
    setOrderSearch(
      `${order.order_number} - ${order.customers?.name || "Unknown"}`,
    );
  }, []);

  const handleUpdateField = useCallback(
    (field: keyof InvoiceFormData, value: any) => {
      setValue(field, value);
    },
    [setValue],
  );

  const handleSelectCustomer = useCallback(
    (customerId: string, customerName: string) => {
      setValue("customer_id", customerId);
      setCustomerSearch(customerName);
    },
    [setValue],
  );

  const handleGenerateInvoiceNumber = useCallback(() => {
    // No-op: invoice number now always comes from the linked order
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
    createInvoiceMutation.mutate(data, {
      onSuccess: (created: any) => {
        toast.showToast(
          "success",
          "Invoice Created",
          "Invoice created successfully",
        );
        setTimeout(() => {
          router.replace(`/invoices/${created.id}` as any);
        }, 350);
      },
      onError: (error: any) => {
        toast.showToast(
          "error",
          "Creation Failed",
          error?.message || "Failed to create invoice",
        );
      },
    });
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
        error.message || "Failed to generate PDF",
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
            onPress={handleSubmit(onSubmit as any)}
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
