import React, { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SafeScreen, spacing } from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
  FormContainer,
} from "@/components/FormComponents";
import { useToastHelpers } from "@/lib/toast";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface PaymentFormState {
  customer_id: string;
  amount: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  payment_date: string;
}

export default function CreatePaymentPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastHelpers();

  // Form state
  const [formData, setFormData] = useState<PaymentFormState>({
    customer_id: "",
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
    payment_date: new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch customers for selection
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...paymentData,
          amount: parseFloat(paymentData.amount),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-transactions"] });
      showSuccess("Payment Recorded", "Payment has been recorded successfully");
      router.back();
    },
    onError: (error: any) => {
      showError("Error", error.message || "Failed to create payment");
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = "Please select a customer";
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (!formData.payment_method) {
      newErrors.payment_method = "Please select a payment method";
    }

    if (!formData.payment_date) {
      newErrors.payment_date = "Please select a payment date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    Alert.alert(
      "Record Payment",
      `Record payment of ₹${formData.amount} for ${
        customers.find((c) => c.id === formData.customer_id)?.name ||
        "selected customer"
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record Payment",
          onPress: () => createPaymentMutation.mutate(formData),
        },
      ]
    );
  };

  const updateFormData = (field: keyof PaymentFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <SafeScreen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
      >
        <FormContainer>
          <FormSection title="Payment Details">
            <FormInput
              label="Customer"
              value={
                customers.find((c) => c.id === formData.customer_id)?.name || ""
              }
              onChangeText={() => {}} // This would open a customer selection modal
              placeholder="Select customer"
              error={errors.customer_id}
              editable={false}
              onPress={() =>
                Alert.alert("Info", "Customer selection modal would open here")
              }
            />

            <FormInput
              label="Amount"
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              placeholder="Enter payment amount"
              keyboardType="numeric"
              error={errors.amount}
            />

            <FormInput
              label="Payment Method"
              value={formData.payment_method}
              onChangeText={() => {}} // This would open a payment method selection
              placeholder="Select payment method"
              error={errors.payment_method}
              editable={false}
              onPress={() =>
                Alert.alert("Info", "Payment method selection would open here")
              }
            />

            <FormInput
              label="Reference Number (Optional)"
              value={formData.reference_number}
              onChangeText={(value) =>
                updateFormData("reference_number", value)
              }
              placeholder="Enter reference number"
            />

            <FormInput
              label="Payment Date"
              value={formData.payment_date}
              onChangeText={(value) => updateFormData("payment_date", value)}
              placeholder="YYYY-MM-DD"
              error={errors.payment_date}
            />

            <FormInput
              label="Notes (Optional)"
              value={formData.notes}
              onChangeText={(value) => updateFormData("notes", value)}
              placeholder="Enter payment notes"
              multiline
              numberOfLines={3}
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
              title="Record Payment"
              onPress={handleSubmit}
              loading={createPaymentMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </FormContainer>
      </ScrollView>
    </SafeScreen>
  );
}
