import React, { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Header,
  Card,
  Button,
  Input,
  SearchInput,
  SafeScreen,
  colors,
  spacing,
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

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

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: `INV-${Date.now()}`,
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
  const [customerSearch, setCustomerSearch] = useState("");

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

  // Create invoice mutation
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
    if (!formData.pdf_url) {
      newErrors.pdf_url = "PDF URL is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    createInvoiceMutation.mutate(formData);
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
    <SafeScreen>
      <Header
        title="Create Invoice"
        subtitle="Generate a new invoice"
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding={6}>
          <View style={{ gap: spacing[5] }}>
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

            <Input
              label="Invoice Number"
              value={formData.invoice_number}
              onChangeText={(value) => updateFormData("invoice_number", value)}
              placeholder="Enter invoice number"
              error={errors.invoice_number}
            />

            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.gray[700],
                  marginBottom: spacing[2],
                }}
              >
                Customer *
              </Text>
              <SearchInput
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search customers..."
              />
              {customers.length > 0 && (
                <ScrollView
                  style={{
                    maxHeight: 150,
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    borderRadius: 8,
                    marginTop: spacing[2],
                  }}
                >
                  {customers.map((customer) => (
                    <Button
                      key={customer.id}
                      title={`${customer.name} ${customer.company_name ? `(${customer.company_name})` : ""}`}
                      variant={
                        formData.customer_id === customer.id
                          ? "primary"
                          : "ghost"
                      }
                      onPress={() => {
                        updateFormData("customer_id", customer.id);
                        setCustomerSearch(customer.name);
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

            <Input
              label="Issue Date"
              value={formData.issue_date}
              onChangeText={(value) => updateFormData("issue_date", value)}
              placeholder="YYYY-MM-DD"
              error={errors.issue_date}
            />

            <Input
              label="Due Date"
              value={formData.due_date}
              onChangeText={(value) => updateFormData("due_date", value)}
              placeholder="YYYY-MM-DD"
              error={errors.due_date}
            />

            <Input
              label="Amount"
              value={formData.amount.toString()}
              onChangeText={(value) =>
                updateFormData("amount", parseFloat(value) || 0)
              }
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.amount}
            />

            <Input
              label="Tax Amount"
              value={formData.tax.toString()}
              onChangeText={(value) =>
                updateFormData("tax", parseFloat(value) || 0)
              }
              placeholder="0.00"
              keyboardType="numeric"
            />

            <View
              style={{
                padding: spacing[3],
                backgroundColor: colors.gray[50],
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                Total Amount: ₹{calculateTotal().toLocaleString()}
              </Text>
            </View>

            <Input
              label="PDF URL"
              value={formData.pdf_url}
              onChangeText={(value) => updateFormData("pdf_url", value)}
              placeholder="Enter PDF URL or file path"
              error={errors.pdf_url}
            />
          </View>
        </Card>

        <View
          style={{
            flexDirection: "row",
            gap: spacing[3],
            marginTop: spacing[6],
          }}
        >
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={{ flex: 1 }}
          />
          <Button
            title={
              createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"
            }
            variant="primary"
            onPress={handleSubmit}
            disabled={createInvoiceMutation.isPending}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
