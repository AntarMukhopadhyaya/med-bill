import React, { useState } from "react";
import { View, Text, Alert, TouchableOpacity, ScrollView } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { HeaderWithSearch, spacing, colors } from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
  FormContainer,
} from "@/components/FormComponents";
import { router } from "expo-router";
import { useToastHelpers } from "@/lib/toast";

export default function RefundPaymentPage() {
  const { showSuccess, showError } = useToastHelpers();
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!paymentId) throw new Error("Payment ID required");
      const { error } = await (supabase as any).rpc("refund_payment", {
        p_payment_id: paymentId,
        p_amount: amount ? parseFloat(amount) : null,
        p_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Refund Recorded", "Refund has been processed");
      router.replace(`/payments/${paymentId}` as any);
    },
    onError: (e: any) =>
      showError("Refund Error", e.message || "Failed to refund"),
  });

  const submit = () => {
    if (!paymentId) {
      showError("Validation", "Enter payment ID");
      return;
    }
    Alert.alert("Confirm Refund", `Refund payment ${paymentId}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Refund",
        style: "destructive",
        onPress: () => refundMutation.mutate(),
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <HeaderWithSearch
        title="Refund Payment"
        searchValue=""
        onSearchChange={() => {}}
        placeholder=""
        showAddButton={false}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing[6] }}>
        <FormContainer onSubmit={submit}>
          <FormSection title="Refund Details">
            <FormInput
              label="Payment ID"
              value={paymentId}
              onChangeText={setPaymentId}
              placeholder="Existing payment UUID"
              required
            />
            <FormInput
              label="Refund Amount (optional)"
              value={amount}
              onChangeText={setAmount}
              placeholder="Leave blank for full amount"
              keyboardType="numeric"
            />
            <FormInput
              label="Reason"
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for refund"
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
              title="Process Refund"
              onPress={submit}
              loading={refundMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </FormContainer>
      </ScrollView>
      <View
        style={{ padding: spacing[4], backgroundColor: colors.warning[50] }}
      >
        <Text style={{ fontSize: 12, color: colors.warning[600] }}>
          Refund creates a reversing ledger debit. Allocations are not
          automatically reversed yet.
        </Text>
      </View>
    </View>
  );
}
