import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PaymentWithCustomer, PaymentSummary } from "@/types/payment";
import { PaymentsHeader } from "@/components/payments/PaymentsHeader";
import { PaymentSummary as PaymentSummaryComponent } from "@/components/payments/PaymentSummary";

import { LoadingSpinner } from "@/components/DesignSystem";
import { colors, spacing } from "@/components/DesignSystem";
import { PaymentsList } from "@/components/payments/PaymentsList";

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch payments with customer details and allocations
  const {
    data: payments = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["payments", debouncedSearchQuery],
    queryFn: async (): Promise<PaymentWithCustomer[]> => {
      let query = supabase
        .from("payments")
        .select(
          `
          *,
          customers:customer_id (
            name,
            company_name
          ),
          payment_allocations:payment_allocations (
            *,
            invoices:invoice_id (
              invoice_number,
              amount
            )
          )
        `
        )
        .order("payment_date", { ascending: false });

      if (debouncedSearchQuery.trim()) {
        query = query.or(`
          payment_method.ilike.%${debouncedSearchQuery}%,
          reference_number.ilike.%${debouncedSearchQuery}%,
          notes.ilike.%${debouncedSearchQuery}%,
          customers.name.ilike.%${debouncedSearchQuery}%,
          customers.company_name.ilike.%${debouncedSearchQuery}%
        `);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Calculate summary statistics
  const summary = useMemo((): PaymentSummary => {
    const now = new Date();
    const thisMonthPayments = payments.filter((payment) => {
      const paymentDate = new Date(payment.payment_date);
      return (
        paymentDate.getMonth() === now.getMonth() &&
        paymentDate.getFullYear() === now.getFullYear()
      );
    });

    const paymentMethods = payments.reduce(
      (acc, payment) => {
        const method =
          payment.payment_method as keyof PaymentSummary["paymentMethods"];
        acc[method] = (acc[method] || 0) + payment.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalPayments: payments.reduce((sum, payment) => sum + payment.amount, 0),
      totalCount: payments.length,
      thisMonthTotal: thisMonthPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      ),
      thisMonthCount: thisMonthPayments.length,
      paymentMethods,
    };
  }, [payments]);

  // Handlers
  const handleCreatePayment = useCallback(() => {
    router.push("/payments/create");
  }, []);

  const handleViewPayment = useCallback((payment: PaymentWithCustomer) => {
    router.push(`/payments/${payment.id}`);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  if (isLoading && payments.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <PaymentsHeader
          title="Payments"
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          onAddPress={handleCreatePayment}
          itemCount={0}
          itemLabel="payments"
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LoadingSpinner
            size="large"
            message="Loading payments..."
            variant="default"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
      <PaymentsHeader
        title="Payments"
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        onAddPress={handleCreatePayment}
        itemCount={payments.length}
        itemLabel="payments"
        isFilterActive={!!searchQuery}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing[6] }}
      >
        {/* Summary Cards */}
        <PaymentSummaryComponent summary={summary} />

        {/* Payments List */}
        <PaymentsList
          payments={payments}
          isRefetching={isRefetching}
          refetch={refetch}
          onViewPayment={handleViewPayment}
          searchQuery={searchQuery}
          isLoading={isLoading}
          onCreatePayment={handleCreatePayment}
          onClearFilters={handleClearFilters}
        />
      </ScrollView>
    </View>
  );
}
