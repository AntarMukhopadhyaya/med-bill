import React, { useState, useMemo } from "react";
import { TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/DesignSystem";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import { StandardHeader, StandardPage } from "@/components/layout";
import { LedgerList } from "@/components/ledgers/LedgerList";
import { Pressable } from "@/components/ui/pressable";

type Ledger = Database["public"]["Tables"]["ledgers"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface LedgerSummary {
  total_customers: number;
  customers_with_positive_balance: number;
  customers_with_negative_balance: number;
  customers_with_zero_balance: number;
  total_outstanding_receivables: number;
  total_outstanding_payables: number;
  net_position: number;
}

interface AgingAnalysis {
  customer_id: string;
  customer_name: string;
  current_balance: number;
  days_0_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
}

interface LedgerWithDetails extends Ledger {
  customer?: Customer;
}

export default function LedgerManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "current_balance">(
    "created_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Ledger entries query with customer details
  const {
    data: ledgers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["ledgers", sortBy, sortOrder],
    queryFn: async (): Promise<LedgerWithDetails[]> => {
      const { data, error } = await supabase
        .from("ledgers")
        .select(
          `
          *,
          customer:customers(*)
        `
        )
        .order(sortBy, { ascending: sortOrder === "asc" });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Enhanced summary with aging analysis
  const { data: ledgerSummary } = useQuery({
    queryKey: ["ledger-summary"],
    queryFn: async (): Promise<LedgerSummary | null> => {
      const { data, error } = await supabase.rpc("get_ledger_summary");
      if (error) throw error;
      return data?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Customer aging analysis
  const { data: agingAnalysis = [] } = useQuery({
    queryKey: ["customer-aging"],
    queryFn: async (): Promise<AgingAnalysis[]> => {
      const { data, error } = await supabase.rpc("get_customer_aging_analysis");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Calculate totals
  const totals = useMemo(() => {
    const totalBalance = ledgers.reduce(
      (sum, ledger) => sum + ledger.current_balance,
      0
    );
    const totalOpening = ledgers.reduce(
      (sum, ledger) => sum + ledger.opening_balance,
      0
    );
    const positiveBalances = ledgers.filter(
      (l) => l.current_balance > 0
    ).length;
    const negativeBalances = ledgers.filter(
      (l) => l.current_balance < 0
    ).length;

    return {
      totalBalance,
      totalOpening,
      positiveBalances,
      negativeBalances,
      totalLedgers: ledgers.length,
    };
  }, [ledgers]);

  // Filtered and sorted ledger entries
  const filteredAndSortedLedgers = useMemo(() => {
    return ledgers.filter((ledger) => {
      const matchesSearch =
        ledger.customer?.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        ledger.customer?.company_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [ledgers, searchQuery]);

  return (
    <StandardPage refreshing={isRefetching} onRefresh={refetch}>
      <StandardHeader
        title="Ledgers"
        subtitle="Manage your financial ledgers"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFiltersButton={false}
        showAddButton={false}
      />

      {/* Summary Cards */}
      <VStack className="p-6 gap-4">
        <Text className="text-xl font-bold text-typography-900">
          Ledger Summary
        </Text>

        <HStack className="gap-3 flex-wrap">
          <VStack className="flex-1 min-w-[120px]">
            <Card variant="elevated" className="p-3 bg-primary-50">
              <VStack className="items-center gap-1">
                <FontAwesome
                  name="users"
                  size={20}
                  color="rgb(var(--color-primary-500))"
                />
                <Text className="text-xs text-primary-600 text-center font-medium">
                  Total Ledgers
                </Text>
                <Text className="text-base font-bold text-primary-600 text-center">
                  {ledgerSummary?.total_customers || totals.totalLedgers}
                </Text>
              </VStack>
            </Card>
          </VStack>

          <VStack className="flex-1 min-w-[120px]">
            <Card variant="elevated" className="p-3 bg-success-50">
              <VStack className="items-center gap-1">
                <FontAwesome
                  name="arrow-up"
                  size={20}
                  color="rgb(var(--color-success-500))"
                />
                <Text className="text-xs text-success-600 text-center font-medium">
                  Receivables
                </Text>
                <Text className="text-sm font-bold text-success-600 text-center">
                  ₹
                  {(
                    ledgerSummary?.total_outstanding_receivables || 0
                  ).toLocaleString()}
                </Text>
              </VStack>
            </Card>
          </VStack>

          <VStack className="flex-1 min-w-[120px]">
            <Card variant="elevated" className="p-3 bg-error-50">
              <VStack className="items-center gap-1">
                <FontAwesome
                  name="arrow-down"
                  size={20}
                  color="rgb(var(--color-error-500))"
                />
                <Text className="text-xs text-error-600 text-center font-medium">
                  Payables
                </Text>
                <Text className="text-sm font-bold text-error-600 text-center">
                  ₹
                  {(
                    ledgerSummary?.total_outstanding_payables || 0
                  ).toLocaleString()}
                </Text>
              </VStack>
            </Card>
          </VStack>

          <VStack className="flex-1 min-w-[120px]">
            <Card
              variant="elevated"
              className={`p-3 ${
                (ledgerSummary?.net_position || totals.totalBalance) >= 0
                  ? "bg-success-50"
                  : "bg-error-50"
              }`}
            >
              <VStack className="items-center gap-1">
                <FontAwesome
                  name="balance-scale"
                  size={20}
                  color={
                    (ledgerSummary?.net_position || totals.totalBalance) >= 0
                      ? "rgb(var(--color-success-500))"
                      : "rgb(var(--color-error-500))"
                  }
                />
                <Text
                  className={`text-xs text-center font-medium ${
                    (ledgerSummary?.net_position || totals.totalBalance) >= 0
                      ? "text-success-600"
                      : "text-error-600"
                  }`}
                >
                  Net Position
                </Text>
                <Text
                  className={`text-sm font-bold text-center ${
                    (ledgerSummary?.net_position || totals.totalBalance) >= 0
                      ? "text-success-600"
                      : "text-error-600"
                  }`}
                >
                  ₹
                  {Math.abs(
                    ledgerSummary?.net_position || totals.totalBalance
                  ).toLocaleString()}
                </Text>
              </VStack>
            </Card>
          </VStack>
        </HStack>

        {/* Controls */}
        <HStack className="justify-between items-center mb-4">
          <HStack className="gap-2">
            <Pressable
              onPress={() => setSortBy("created_at")}
              className={`px-3 py-2 rounded-lg border ${
                sortBy === "created_at"
                  ? "bg-primary-100 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  sortBy === "created_at"
                    ? "text-primary-600"
                    : "text-typography-600"
                }`}
              >
                By Date
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSortBy("current_balance")}
              className={`px-3 py-2 rounded-lg border ${
                sortBy === "current_balance"
                  ? "bg-primary-100 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  sortBy === "current_balance"
                    ? "text-primary-600"
                    : "text-typography-600"
                }`}
              >
                By Balance
              </Text>
            </Pressable>
          </HStack>

          <Button
            onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FontAwesome
              name={sortOrder === "asc" ? "sort-asc" : "sort-desc"}
              size={14}
              color="rgb(var(--color-typography-600))"
            />
            <ButtonText className="text-typography-600">
              {sortOrder === "asc" ? "Sort Desc" : "Sort Asc"}
            </ButtonText>
          </Button>
        </HStack>
      </VStack>

      {/* Ledger List */}
      <LedgerList
        ledgers={filteredAndSortedLedgers}
        isRefetching={isRefetching}
        refetch={refetch}
        searchQuery={searchQuery}
        isLoading={isLoading}
      />
    </StandardPage>
  );
}
