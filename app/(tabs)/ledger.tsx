import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
  FlatList,
} from "react-native";
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
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

type Ledger = Database["public"]["Tables"]["ledgers"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

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
        style={{ marginBottom: spacing[3] }}
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
              title="View Transactions"
              onPress={() =>
                Alert.alert("Info", "Transaction history feature coming soon")
              }
              variant="outline"
              size="sm"
              icon="list"
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
      <Header
        title="Ledger Management"
        subtitle={`${filteredAndSortedLedgers.length} customer ledgers`}
        rightElement={
          <Button
            title="Generate Report"
            onPress={() =>
              Alert.alert("Info", "Report generation feature coming soon")
            }
            variant="outline"
            icon="file-text"
            size="sm"
          />
        }
      />

      {/* Summary Cards */}
      <View style={{ padding: spacing[6] }}>
        <SectionHeader title="Ledger Summary" />

        <View
          style={{
            flexDirection: "row",
            gap: spacing[3],
            marginBottom: spacing[6],
            flexWrap: "wrap",
          }}
        >
          <View style={{ flex: 1, minWidth: 120 }}>
            <Card variant="elevated" padding={3}>
              <View style={{ alignItems: "center", gap: spacing[1] }}>
                <FontAwesome
                  name="users"
                  size={20}
                  color={colors.primary[500]}
                />
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.gray[600],
                    textAlign: "center",
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
                  {totals.totalLedgers}
                </Text>
              </View>
            </Card>
          </View>

          <View style={{ flex: 1, minWidth: 120 }}>
            <Card variant="elevated" padding={3}>
              <View style={{ alignItems: "center", gap: spacing[1] }}>
                <FontAwesome
                  name="plus-circle"
                  size={20}
                  color={colors.success[500]}
                />
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.gray[600],
                    textAlign: "center",
                  }}
                >
                  Credit Balances
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.success[600],
                    textAlign: "center",
                  }}
                >
                  {totals.positiveBalances}
                </Text>
              </View>
            </Card>
          </View>

          <View style={{ flex: 1, minWidth: 120 }}>
            <Card variant="elevated" padding={3}>
              <View style={{ alignItems: "center", gap: spacing[1] }}>
                <FontAwesome
                  name="minus-circle"
                  size={20}
                  color={colors.error[500]}
                />
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.gray[600],
                    textAlign: "center",
                  }}
                >
                  Debit Balances
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.error[600],
                    textAlign: "center",
                  }}
                >
                  {totals.negativeBalances}
                </Text>
              </View>
            </Card>
          </View>

          <View style={{ flex: 1, minWidth: 120 }}>
            <Card variant="elevated" padding={3}>
              <View style={{ alignItems: "center", gap: spacing[1] }}>
                <FontAwesome
                  name="balance-scale"
                  size={20}
                  color={
                    totals.totalBalance >= 0
                      ? colors.success[500]
                      : colors.error[500]
                  }
                />
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.gray[600],
                    textAlign: "center",
                  }}
                >
                  Net Balance
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color:
                      totals.totalBalance >= 0
                        ? colors.success[600]
                        : colors.error[600],
                    textAlign: "center",
                  }}
                >
                  ₹{Math.abs(totals.totalBalance).toLocaleString()}
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
            onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            variant="ghost"
            icon={sortOrder === "asc" ? "sort-asc" : "sort-desc"}
            size="sm"
          />
        </View>
      </View>

      {/* Ledger List */}
      <FlatList
        data={filteredAndSortedLedgers}
        renderItem={({ item }) => <LedgerCard ledger={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[6],
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={() => (
          <EmptyState
            icon="book"
            title="No ledgers found"
            description={
              searchQuery
                ? "Try adjusting your search terms"
                : "Customer ledgers will appear here as they are created"
            }
          />
        )}
      />
    </View>
  );
}
