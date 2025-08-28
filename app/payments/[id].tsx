import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { HeaderWithSearch, spacing, colors } from "@/components/DesignSystem";

export default function PaymentDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  type AnyPayment = any; // relax typing
  const { data: payment, isLoading: loadingPayment } = useQuery<AnyPayment>({
    queryKey: ["payment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as AnyPayment;
    },
    enabled: !!id,
  });

  const { data: allocations = [], isLoading: loadingAlloc } = useQuery<any[]>({
    queryKey: ["payment-allocations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_allocations")
        .select(
          "*, invoices(id, invoice_number, amount, tax, amount_paid, status)"
        )
        .eq("payment_id", id);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const { data: ledgerTxns = [], isLoading: loadingLedger } = useQuery<any[]>({
    queryKey: ["payment-ledger-txns", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_transactions")
        .select("*, ledgers(customer_id)")
        .eq("reference_type", "payment")
        .eq("reference_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const { data: refundHistory = [] } = useQuery<any[]>({
    queryKey: ["payment-refunds", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_refunds")
        .select("*")
        .eq("payment_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const totalRefunded = refundHistory.reduce(
    (s: any, r: any) => s + Number(r.amount || 0),
    0
  );
  const maxRefundable = payment ? Number(payment.amount) : 0;
  const remainingRefundable = Math.max(0, maxRefundable - totalRefunded);

  return (
    <View style={{ flex: 1 }}>
      <HeaderWithSearch
        title={`Payment`}
        searchValue=""
        onSearchChange={() => {}}
        placeholder=""
        showAddButton={false}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing[6], gap: spacing[6] }}
      >
        {/* Refund button */}
        <TouchableOpacity
          onPress={() => router.push(`/payments/refund` as any)}
          style={{
            backgroundColor: colors.error[500],
            padding: spacing[3],
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              color: colors.white,
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            Refund Payment
          </Text>
        </TouchableOpacity>

        <View
          style={{
            backgroundColor: colors.white,
            padding: spacing[5],
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.gray[200],
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: spacing[2],
            }}
          >
            Payment Info
          </Text>
          {loadingPayment ? (
            <Text>Loading...</Text>
          ) : payment ? (
            <>
              <Text style={{ color: colors.gray[700] }}>
                Amount: ₹{Number(payment.amount).toLocaleString()}
              </Text>
              <Text style={{ color: colors.gray[700] }}>
                Method: {payment.payment_method}
              </Text>
              <Text style={{ color: colors.gray[700] }}>
                Date: {new Date(payment.payment_date).toLocaleDateString()}
              </Text>
              {payment.reference_number && (
                <Text style={{ color: colors.gray[700] }}>
                  Ref: {payment.reference_number}
                </Text>
              )}
              {payment.notes && (
                <Text style={{ color: colors.gray[700] }}>
                  Notes: {payment.notes}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: colors.error[600] }}>Not found</Text>
          )}
        </View>

        <View
          style={{
            backgroundColor: colors.white,
            padding: spacing[5],
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.gray[200],
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: spacing[2],
            }}
          >
            Allocations
          </Text>
          {loadingAlloc ? (
            <Text>Loading...</Text>
          ) : allocations.length === 0 ? (
            <Text style={{ color: colors.gray[500] }}>No allocations</Text>
          ) : (
            allocations.map((a: any) => {
              const inv = a.invoices;
              return (
                <View
                  key={a.id}
                  style={{
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.gray[100],
                  }}
                >
                  <Text style={{ fontWeight: "600", color: colors.gray[800] }}>
                    Invoice #{inv?.invoice_number}
                  </Text>
                  <Text style={{ color: colors.gray[600] }}>
                    Allocated: ₹{a.amount.toLocaleString()} / Total: ₹
                    {(inv?.amount + inv?.tax).toLocaleString()}
                  </Text>
                  {inv?.amount_paid !== undefined && (
                    <Text style={{ color: colors.gray[600] }}>
                      Paid: ₹{inv.amount_paid?.toLocaleString()}
                    </Text>
                  )}
                  <Text style={{ color: colors.gray[600] }}>
                    Status: {inv?.status}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View
          style={{
            backgroundColor: colors.white,
            padding: spacing[5],
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.gray[200],
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: spacing[2],
            }}
          >
            Ledger Transaction
          </Text>
          {loadingLedger ? (
            <Text>Loading...</Text>
          ) : ledgerTxns.length === 0 ? (
            <Text style={{ color: colors.gray[500] }}>
              No ledger transaction
            </Text>
          ) : (
            <>
              {ledgerTxns.map((t: any) => (
                <View
                  key={t.id}
                  style={{
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.gray[100],
                  }}
                >
                  <Text style={{ fontWeight: "600", color: colors.gray[800] }}>
                    {t.transaction_type.toUpperCase()} ₹
                    {t.amount.toLocaleString()}
                  </Text>
                  <Text style={{ color: colors.gray[600] }}>
                    {new Date(t.transaction_date).toLocaleDateString()}
                  </Text>
                  {t.description && (
                    <Text style={{ color: colors.gray[600] }}>
                      {t.description}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        <View
          style={{
            backgroundColor: colors.white,
            padding: spacing[5],
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.gray[200],
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: spacing[2],
            }}
          >
            Refunds
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.gray[600],
              marginBottom: spacing[2],
            }}
          >
            Total Refunded: ₹{totalRefunded.toLocaleString()} • Remaining: ₹
            {remainingRefundable.toLocaleString()}
          </Text>
          {refundHistory.length === 0 ? (
            <Text style={{ color: colors.gray[500] }}>No refunds</Text>
          ) : (
            refundHistory.map((r) => (
              <View
                key={r.id}
                style={{
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray[100],
                }}
              >
                <Text
                  style={{
                    color: colors.error[600],
                    fontWeight: "600",
                  }}
                >
                  Refund ₹{Number(r.amount).toLocaleString()}
                </Text>
                <Text
                  style={{
                    color: colors.gray[600],
                    fontSize: 12,
                  }}
                >
                  {new Date(r.created_at).toLocaleDateString()}{" "}
                  {r.reason ? "• " + r.reason : ""}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
