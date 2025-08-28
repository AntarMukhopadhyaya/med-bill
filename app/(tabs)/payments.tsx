import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { HeaderWithSearch, spacing, colors } from "@/components/DesignSystem";
import { SearchBar } from "@/components/SearchBar";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  customers?: {
    name: string;
    company_name: string | null;
  };
}

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch payments with customer details
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", searchQuery],
    queryFn: async (): Promise<Payment[]> => {
      let query = supabase
        .from("payments")
        .select(
          `
          *,
          customers:customer_id (
            name,
            company_name
          )
        `
        )
        .order("payment_date", { ascending: false });

      if (searchQuery.trim()) {
        // For payments, we can search by amount, payment method, or reference number
        const searchTerm = searchQuery.trim();
        query = query.or(
          `payment_method.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate summary stats
  const totalPayments = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const thisMonthPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.payment_date);
    const now = new Date();
    return (
      paymentDate.getMonth() === now.getMonth() &&
      paymentDate.getFullYear() === now.getFullYear()
    );
  });
  const thisMonthTotal = thisMonthPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return "money";
      case "bank_transfer":
        return "bank";
      case "credit_card":
      case "debit_card":
        return "credit-card";
      case "upi":
        return "mobile";
      case "cheque":
        return "file-text-o";
      default:
        return "money";
    }
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "cash":
        return "Cash";
      case "bank_transfer":
        return "Bank Transfer";
      case "credit_card":
        return "Credit Card";
      case "debit_card":
        return "Debit Card";
      case "upi":
        return "UPI";
      case "cheque":
        return "Cheque";
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const PaymentCard = ({ payment }: { payment: Payment }) => (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing[4],
        marginBottom: spacing[3],
        borderWidth: 1,
        borderColor: colors.gray[200],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontWeight: "600",
              fontSize: 16,
              color: colors.gray[900],
              marginBottom: 4,
            }}
          >
            {(payment.customers as any)?.name || "Unknown Customer"}
          </Text>
          {(payment.customers as any)?.company_name && (
            <Text
              style={{ fontSize: 14, color: colors.gray[600], marginBottom: 2 }}
            >
              {(payment.customers as any).company_name}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.gray[500] }}>
            {formatDate(payment.payment_date)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontWeight: "700",
              fontSize: 18,
              color: colors.success[600],
            }}
          >
            ₹{payment.amount.toLocaleString()}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <FontAwesome
            name={getPaymentMethodIcon(payment.payment_method)}
            size={14}
            color={colors.gray[500]}
            style={{ marginRight: 6 }}
          />
          <Text style={{ fontSize: 14, color: colors.gray[600] }}>
            {formatPaymentMethod(payment.payment_method)}
          </Text>
          {payment.reference_number && (
            <Text
              style={{ fontSize: 12, color: colors.gray[500], marginLeft: 8 }}
            >
              Ref: {payment.reference_number}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: colors.gray[100],
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1],
            borderRadius: 6,
          }}
          onPress={() => {
            // TODO: Navigate to payment details
            console.log("View payment details:", payment.id);
          }}
        >
          <Text style={{ fontSize: 12, color: colors.gray[700] }}>View</Text>
        </TouchableOpacity>
      </View>

      {payment.notes && (
        <View
          style={{
            marginTop: spacing[3],
            paddingTop: spacing[3],
            borderTopWidth: 1,
            borderTopColor: colors.gray[100],
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: colors.gray[600],
              fontStyle: "italic",
            }}
          >
            {payment.notes}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <HeaderWithSearch
        title="Payments"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search payments..."
        showAddButton={true}
        onAddPress={() => router.push("/payments/create")}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
      >
        {/* Summary Cards */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: spacing[6],
            gap: spacing[4],
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.primary[50],
              padding: spacing[4],
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary[500],
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.primary[600],
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              Total Payments
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.primary[700],
              }}
            >
              ₹{totalPayments.toLocaleString()}
            </Text>
            <Text
              style={{ fontSize: 11, color: colors.primary[600], marginTop: 2 }}
            >
              {payments.length} payments
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.success[50],
              padding: spacing[4],
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: colors.success[500],
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.success[600],
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              This Month
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.success[700],
              }}
            >
              ₹{thisMonthTotal.toLocaleString()}
            </Text>
            <Text
              style={{ fontSize: 11, color: colors.success[600], marginTop: 2 }}
            >
              {thisMonthPayments.length} payments
            </Text>
          </View>
        </View>

        {/* Payments List */}
        <View style={{ marginBottom: spacing[6] }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Recent Payments
          </Text>

          {isLoading ? (
            <View style={{ alignItems: "center", padding: spacing[8] }}>
              <FontAwesome name="spinner" size={32} color={colors.gray[400]} />
              <Text style={{ color: colors.gray[500], marginTop: spacing[4] }}>
                Loading payments...
              </Text>
            </View>
          ) : payments.length === 0 ? (
            <View style={{ alignItems: "center", padding: spacing[8] }}>
              <FontAwesome
                name="credit-card"
                size={48}
                color={colors.gray[400]}
              />
              <Text
                style={{
                  color: colors.gray[500],
                  marginTop: spacing[4],
                  fontSize: 16,
                }}
              >
                {searchQuery ? "No payments found" : "No payments recorded yet"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary[500],
                    paddingHorizontal: spacing[6],
                    paddingVertical: spacing[3],
                    borderRadius: 8,
                    marginTop: spacing[4],
                  }}
                  onPress={() => router.push("/payments/create")}
                >
                  <Text style={{ color: colors.white, fontWeight: "600" }}>
                    Record First Payment
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={payments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PaymentCard payment={item} />}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
