import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  Card,
  Button,
  Badge,
  SearchInput,
  FilterChip,
  SectionHeader,
  EmptyState,
  colors,
  spacing,
  SafeScreen,
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

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

  const getBalanceVariant = (
    balance: number
  ): "success" | "error" | "secondary" => {
    if (balance > 0) return "success";
    if (balance < 0) return "error";
    return "secondary";
  };

  const LedgerCard = ({ ledger }: { ledger: LedgerWithDetails }) => {
    const balanceChange = ledger.current_balance - ledger.opening_balance;

    return (
      <Card
        variant="elevated"
        padding={4}
        margin={2}
        style={{
          marginBottom: spacing[3],
          borderLeftWidth: 4,
          borderLeftColor:
            ledger.current_balance >= 0
              ? colors.success[500]
              : colors.error[500],
        }}
      >
        <View style={{ gap: spacing[3] }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
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
                {ledger.customer?.name || "Unknown Customer"}
              </Text>
              {ledger.customer?.company_name && (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.gray[600],
                  }}
                >
                  {ledger.customer.company_name}
                </Text>
              )}
              {ledger.customer?.email && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[500],
                    marginTop: spacing[1],
                  }}
                >
                  {ledger.customer.email}
                </Text>
              )}
            </View>

            <View style={{ alignItems: "flex-end", gap: spacing[1] }}>
              <Badge
                label={ledger.current_balance >= 0 ? "Credit" : "Debit"}
                variant={getBalanceVariant(ledger.current_balance)}
                size="sm"
              />
            </View>
          </View>

          {/* Balance Information */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: spacing[4],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[600],
                  marginBottom: spacing[1],
                }}
              >
                Opening Balance
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[700],
                }}
              >
                ₹{ledger.opening_balance.toLocaleString()}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[600],
                  marginBottom: spacing[1],
                }}
              >
                Current Balance
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color:
                    ledger.current_balance >= 0
                      ? colors.success[600]
                      : colors.error[600],
                }}
              >
                ₹{Math.abs(ledger.current_balance).toLocaleString()}
              </Text>
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[600],
                  marginBottom: spacing[1],
                }}
              >
                Change
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color:
                    balanceChange >= 0
                      ? colors.success[600]
                      : colors.error[600],
                }}
              >
                {balanceChange >= 0 ? "+" : ""}₹{balanceChange.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: spacing[2],
              borderTopWidth: 1,
              borderTopColor: colors.gray[200],
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[500],
              }}
            >
              Created: {new Date(ledger.created_at).toLocaleDateString()}
            </Text>

            <Button
              title="View Details"
              onPress={() => router.push(`/ledgers/${ledger.id}` as any)}
              variant="outline"
              size="sm"
              icon="eye"
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeScreen>
      <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header
          title="Ledger Management"
          subtitle={`${filteredAndSortedLedgers.length} customer ledgers`}
          rightElement={
            <Button
              title="PDF"
              onPress={() => Alert.alert("Info", "PDF generation coming soon")}
              variant="outline"
              icon="file-pdf-o"
              size="sm"
            />
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing[6] }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {/* Summary Cards */}
          <View style={{ padding: spacing[6] }}>
            <SectionHeader title="Ledger Summary" />

            <View
              style={{
                flexDirection: "row",
                gap: spacing[3],
                marginBottom: spacing[4],
                flexWrap: "wrap",
              }}
            >
              <View style={{ flex: 1, minWidth: 120 }}>
                <Card
                  variant="elevated"
                  padding={3}
                  style={{ backgroundColor: colors.primary[50] }}
                >
                  <View style={{ alignItems: "center", gap: spacing[1] }}>
                    <FontAwesome
                      name="users"
                      size={20}
                      color={colors.primary[500]}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.primary[600],
                        textAlign: "center",
                        fontWeight: "500",
                      }}
                    >
                      Total Ledgers
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.primary[600],
                        textAlign: "center",
                      }}
                    >
                      {ledgerSummary?.total_customers || totals.totalLedgers}
                    </Text>
                  </View>
                </Card>
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Card
                  variant="elevated"
                  padding={3}
                  style={{ backgroundColor: colors.success[50] }}
                >
                  <View style={{ alignItems: "center", gap: spacing[1] }}>
                    <FontAwesome
                      name="arrow-up"
                      size={20}
                      color={colors.success[500]}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.success[600],
                        textAlign: "center",
                        fontWeight: "500",
                      }}
                    >
                      Receivables
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.success[600],
                        textAlign: "center",
                      }}
                    >
                      ₹
                      {(
                        ledgerSummary?.total_outstanding_receivables || 0
                      ).toLocaleString()}
                    </Text>
                  </View>
                </Card>
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Card
                  variant="elevated"
                  padding={3}
                  style={{ backgroundColor: colors.error[50] }}
                >
                  <View style={{ alignItems: "center", gap: spacing[1] }}>
                    <FontAwesome
                      name="arrow-down"
                      size={20}
                      color={colors.error[500]}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.error[600],
                        textAlign: "center",
                        fontWeight: "500",
                      }}
                    >
                      Payables
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.error[600],
                        textAlign: "center",
                      }}
                    >
                      ₹
                      {(
                        ledgerSummary?.total_outstanding_payables || 0
                      ).toLocaleString()}
                    </Text>
                  </View>
                </Card>
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Card
                  variant="elevated"
                  padding={3}
                  style={{
                    backgroundColor:
                      (ledgerSummary?.net_position || totals.totalBalance) >= 0
                        ? colors.success[50]
                        : colors.error[50],
                  }}
                >
                  <View style={{ alignItems: "center", gap: spacing[1] }}>
                    <FontAwesome
                      name="balance-scale"
                      size={20}
                      color={
                        (ledgerSummary?.net_position || totals.totalBalance) >=
                        0
                          ? colors.success[500]
                          : colors.error[500]
                      }
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color:
                          (ledgerSummary?.net_position ||
                            totals.totalBalance) >= 0
                            ? colors.success[600]
                            : colors.error[600],
                        textAlign: "center",
                        fontWeight: "500",
                      }}
                    >
                      Net Position
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color:
                          (ledgerSummary?.net_position ||
                            totals.totalBalance) >= 0
                            ? colors.success[600]
                            : colors.error[600],
                        textAlign: "center",
                      }}
                    >
                      ₹
                      {Math.abs(
                        ledgerSummary?.net_position || totals.totalBalance
                      ).toLocaleString()}
                    </Text>
                  </View>
                </Card>
              </View>
            </View>

            {/* Search */}
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by customer name or company..."
            />

            {/* Controls */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing[4],
              }}
            >
              <View style={{ flexDirection: "row", gap: spacing[2] }}>
                <FilterChip
                  label="By Date"
                  selected={sortBy === "created_at"}
                  onPress={() => setSortBy("created_at")}
                />
                <FilterChip
                  label="By Balance"
                  selected={sortBy === "current_balance"}
                  onPress={() => setSortBy("current_balance")}
                />
              </View>

              <Button
                title={sortOrder === "asc" ? "Sort Desc" : "Sort Asc"}
                onPress={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                variant="ghost"
                icon={sortOrder === "asc" ? "sort-asc" : "sort-desc"}
                size="sm"
              />
            </View>
          </View>

          {/* Ledger List */}
          <View style={{ paddingHorizontal: spacing[6] }}>
            {filteredAndSortedLedgers.length === 0 ? (
              <EmptyState
                icon="book"
                title="No ledgers found"
                description={
                  searchQuery
                    ? "Try adjusting your search terms"
                    : "Customer ledgers will appear here as they are created"
                }
              />
            ) : (
              filteredAndSortedLedgers.map((ledger) => (
                <LedgerCard key={ledger.id} ledger={ledger} />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
