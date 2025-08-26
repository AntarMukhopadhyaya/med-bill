import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  RefreshControl,
  FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  FormInput,
  FormButton,
  FormSection,
} from "@/components/FormComponents";
import { Database } from "@/types/database.types";
import {
  generateLedgerPdf,
  writeLedgerPdfToFile,
  uploadLedgerPdfToSupabase,
  shareLedgerPdf,
} from "@/lib/ledgerPdf";
import { useToast } from "@/lib/toast";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Ledger = Database["public"]["Tables"]["ledgers"]["Row"];
type LedgerTransaction =
  Database["public"]["Tables"]["ledger_transactions"]["Row"];

interface LedgerWithCustomer extends Ledger {
  customer: Customer;
}

interface TransactionWithDetails extends LedgerTransaction {
  // Add any additional fields if needed
}

export default function LedgerDetailsPage() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    amount: "",
    transaction_type: "debit" as "debit" | "credit",
    description: "",
    reference_type: "",
    reference_id: "",
  });

  // Fetch ledger details with customer
  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["ledger-details", id],
    queryFn: async (): Promise<LedgerWithCustomer | null> => {
      const { data, error } = await supabase
        .from("ledgers")
        .select(
          `
          *,
          customer:customers(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch transactions for the date range
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch,
  } = useQuery({
    queryKey: ["ledger-transactions", id, dateRange],
    queryFn: async (): Promise<TransactionWithDetails[]> => {
      if (!ledger?.id) return [];

      const { data, error } = await supabase
        .from("ledger_transactions")
        .select("*")
        .eq("ledger_id", ledger.id)
        .gte("transaction_date", dateRange.from)
        .lte("transaction_date", dateRange.to + "T23:59:59")
        .order("transaction_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id,
  });

  // Calculate balances
  const balanceInfo = useMemo(() => {
    if (!transactions.length) {
      return {
        openingBalance: ledger?.opening_balance || 0,
        closingBalance: ledger?.current_balance || 0,
        totalDebits: 0,
        totalCredits: 0,
      };
    }

    const totalDebits = transactions
      .filter((t) => t.transaction_type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCredits = transactions
      .filter((t) => t.transaction_type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);

    const openingBalance = ledger?.opening_balance || 0;
    const closingBalance = openingBalance + totalDebits - totalCredits;

    return {
      openingBalance,
      closingBalance,
      totalDebits,
      totalCredits,
    };
  }, [transactions, ledger]);

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const { data, error } = await supabase
        .from("ledger_transactions")
        .insert({
          ...transactionData,
          ledger_id: ledger?.id,
          amount: parseFloat(transactionData.amount),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Update ledger current balance
      if (ledger) {
        const newBalance =
          transactionForm.transaction_type === "debit"
            ? ledger.current_balance + parseFloat(transactionForm.amount)
            : ledger.current_balance - parseFloat(transactionForm.amount);

        await (supabase as any)
          .from("ledgers")
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ledger.id);
      }
      queryClient.invalidateQueries({ queryKey: ["ledger-details", id] });
      queryClient.invalidateQueries({ queryKey: ["ledger-transactions", id] });
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });

      setShowAddTransaction(false);
      setTransactionForm({
        amount: "",
        transaction_type: "debit",
        description: "",
        reference_type: "",
        reference_id: "",
      });

      toast.showToast({
        type: "success",
        title: "Transaction Added",
        message: "Ledger transaction recorded successfully",
      });
    },
    onError: (error: any) => {
      toast.showToast({
        type: "error",
        title: "Error",
        message: error.message || "Failed to add transaction",
      });
    },
  });

  const handleGeneratePdf = async () => {
    if (!ledger || !ledger.customer) return;

    try {
      setIsGeneratingPdf(true);
      toast.showToast({
        type: "info",
        title: "Generating PDF",
        message: "Creating ledger PDF...",
      });

      const pdfBytes = await generateLedgerPdf({
        customer: ledger.customer,
        transactions,
        dateRange,
        openingBalance: balanceInfo.openingBalance,
        logo: require("@/assets/images/icon.png"),
      });

      const filename = `ledger-${ledger.customer.name.replace(/\s+/g, "-")}-${dateRange.from}-to-${dateRange.to}.pdf`;
      const filePath = await writeLedgerPdfToFile(pdfBytes, filename);

      // Upload to Supabase
      await uploadLedgerPdfToSupabase(filePath, "ledgers");

      toast.showToast({
        type: "success",
        title: "PDF Generated",
        message: "Ledger PDF created successfully",
      });

      // Share the PDF
      await shareLedgerPdf(filePath);
    } catch (error: any) {
      toast.showToast({
        type: "error",
        title: "PDF Error",
        message: error.message || "Failed to generate PDF",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAddTransaction = () => {
    if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!transactionForm.description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    addTransactionMutation.mutate(transactionForm);
  };

  const TransactionCard = ({
    transaction,
    index,
  }: {
    transaction: TransactionWithDetails;
    index: number;
  }) => {
    return (
      <Card
        variant="elevated"
        padding={3}
        margin={1}
        style={{ marginBottom: spacing[2] }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: spacing[1],
              }}
            >
              <Badge
                label={transaction.transaction_type === "debit" ? "Dr" : "Cr"}
                variant={
                  transaction.transaction_type === "debit" ? "error" : "success"
                }
                size="sm"
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[600],
                  marginLeft: spacing[2],
                }}
              >
                {new Date(transaction.transaction_date).toLocaleDateString()}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: colors.gray[900],
                marginBottom: spacing[1],
              }}
            >
              {transaction.description}
            </Text>

            {transaction.reference_type && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[500],
                }}
              >
                Ref: {transaction.reference_type} - {transaction.reference_id}
              </Text>
            )}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color:
                  transaction.transaction_type === "debit"
                    ? colors.error[600]
                    : colors.success[600],
              }}
            >
              ₹{transaction.amount.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  if (ledgerLoading || !ledger) {
    return (
      <SafeScreen>
        <EmptyState
          icon="spinner"
          title="Loading Ledger"
          description="Fetching ledger details..."
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        <Header
          title="Ledger Details"
          subtitle={ledger.customer?.name || "Unknown Customer"}
          rightElement={
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              <Button
                title="Back"
                onPress={() => router.back()}
                variant="ghost"
                icon="arrow-left"
                size="sm"
              />
              <Button
                title="Add Transaction"
                onPress={() => setShowAddTransaction(true)}
                variant="outline"
                icon="plus"
                size="sm"
              />
            </View>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[6] }}
          refreshControl={
            <RefreshControl
              refreshing={transactionsLoading}
              onRefresh={refetch}
            />
          }
        >
          {/* Customer Info */}
          <Card
            variant="elevated"
            padding={4}
            style={{ marginBottom: spacing[4] }}
          >
            <SectionHeader title="Customer Information" />
            <View style={{ gap: spacing[2] }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {ledger.customer.name}
              </Text>
              {ledger.customer.company_name && (
                <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                  {ledger.customer.company_name}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                Phone: {ledger.customer.phone} | Email: {ledger.customer.email}
              </Text>
              {ledger.customer.gstin && (
                <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                  GSTIN: {ledger.customer.gstin}
                </Text>
              )}
            </View>
          </Card>

          {/* Balance Summary */}
          <Card
            variant="elevated"
            padding={4}
            style={{ marginBottom: spacing[4] }}
          >
            <SectionHeader title="Balance Summary" />
            <View
              style={{
                flexDirection: "row",
                gap: spacing[4],
                flexWrap: "wrap",
              }}
            >
              <View style={{ flex: 1, minWidth: 120 }}>
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
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.primary[600],
                  }}
                >
                  ₹{balanceInfo.openingBalance.toLocaleString()}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    marginBottom: spacing[1],
                  }}
                >
                  Total Debits
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.error[600],
                  }}
                >
                  ₹{balanceInfo.totalDebits.toLocaleString()}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    marginBottom: spacing[1],
                  }}
                >
                  Total Credits
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.success[600],
                  }}
                >
                  ₹{balanceInfo.totalCredits.toLocaleString()}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
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
                    fontSize: 20,
                    fontWeight: "700",
                    color:
                      balanceInfo.closingBalance >= 0
                        ? colors.success[600]
                        : colors.error[600],
                  }}
                >
                  ₹{Math.abs(balanceInfo.closingBalance).toLocaleString()}
                  <Text style={{ fontSize: 14 }}>
                    {balanceInfo.closingBalance >= 0 ? " Dr" : " Cr"}
                  </Text>
                </Text>
              </View>
            </View>
          </Card>

          {/* Date Range and Actions */}
          <Card
            variant="elevated"
            padding={4}
            style={{ marginBottom: spacing[4] }}
          >
            <SectionHeader title="Date Range & Actions" />
            <View style={{ gap: spacing[3] }}>
              <View style={{ flexDirection: "row", gap: spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="From Date"
                    value={dateRange.from}
                    onChangeText={(value) =>
                      setDateRange((prev) => ({ ...prev, from: value }))
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="To Date"
                    value={dateRange.to}
                    onChangeText={(value) =>
                      setDateRange((prev) => ({ ...prev, to: value }))
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={isGeneratingPdf ? "Generating..." : "Generate PDF"}
                    onPress={handleGeneratePdf}
                    variant="primary"
                    icon="file-pdf-o"
                    disabled={isGeneratingPdf}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Refresh"
                    onPress={() => refetch()}
                    variant="outline"
                    icon="refresh"
                  />
                </View>
              </View>
            </View>
          </Card>

          {/* Transactions List */}
          <SectionHeader title={`Transactions (${transactions.length})`} />
          {transactions.length === 0 ? (
            <EmptyState
              icon="list"
              title="No Transactions"
              description="No transactions found for the selected date range"
            />
          ) : (
            <View style={{ gap: spacing[2] }}>
              {transactions.map((transaction, index) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  index={index}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add Transaction Modal */}
        <Modal
          visible={showAddTransaction}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeScreen>
            <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
              <Header
                title="Add Transaction"
                rightElement={
                  <View style={{ flexDirection: "row", gap: spacing[2] }}>
                    <Button
                      title="Cancel"
                      onPress={() => setShowAddTransaction(false)}
                      variant="ghost"
                      icon="times"
                      size="sm"
                    />
                    <Button
                      title="Save"
                      onPress={handleAddTransaction}
                      variant="primary"
                      icon="check"
                      size="sm"
                      loading={addTransactionMutation.isPending}
                    />
                  </View>
                }
              />

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: spacing[6] }}
              >
                <FormSection title="Transaction Details">
                  <FormInput
                    label="Amount"
                    value={transactionForm.amount}
                    onChangeText={(value) =>
                      setTransactionForm((prev) => ({ ...prev, amount: value }))
                    }
                    placeholder="Enter amount"
                    keyboardType="numeric"
                  />

                  <View style={{ marginBottom: spacing[4] }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: colors.gray[700],
                        marginBottom: spacing[2],
                      }}
                    >
                      Transaction Type
                    </Text>
                    <View style={{ flexDirection: "row", gap: spacing[3] }}>
                      <TouchableOpacity
                        onPress={() =>
                          setTransactionForm((prev) => ({
                            ...prev,
                            transaction_type: "debit",
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: spacing[3],
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor:
                            transactionForm.transaction_type === "debit"
                              ? colors.error[500]
                              : colors.gray[300],
                          backgroundColor:
                            transactionForm.transaction_type === "debit"
                              ? colors.error[50]
                              : colors.white,
                        }}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "500",
                            color:
                              transactionForm.transaction_type === "debit"
                                ? colors.error[600]
                                : colors.gray[600],
                          }}
                        >
                          Debit (Sale)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          setTransactionForm((prev) => ({
                            ...prev,
                            transaction_type: "credit",
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: spacing[3],
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor:
                            transactionForm.transaction_type === "credit"
                              ? colors.success[500]
                              : colors.gray[300],
                          backgroundColor:
                            transactionForm.transaction_type === "credit"
                              ? colors.success[50]
                              : colors.white,
                        }}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "500",
                            color:
                              transactionForm.transaction_type === "credit"
                                ? colors.success[700]
                                : colors.gray[600],
                          }}
                        >
                          Credit (Payment)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <FormInput
                    label="Description"
                    value={transactionForm.description}
                    onChangeText={(value) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        description: value,
                      }))
                    }
                    placeholder="Enter transaction description"
                    multiline
                    numberOfLines={3}
                  />

                  <FormInput
                    label="Reference Type (Optional)"
                    value={transactionForm.reference_type}
                    onChangeText={(value) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        reference_type: value,
                      }))
                    }
                    placeholder="e.g., Invoice, Order, Payment"
                  />

                  <FormInput
                    label="Reference ID (Optional)"
                    value={transactionForm.reference_id}
                    onChangeText={(value) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        reference_id: value,
                      }))
                    }
                    placeholder="e.g., INV001, ORD123"
                  />
                </FormSection>
              </ScrollView>
            </View>
          </SafeScreen>
        </Modal>
      </View>
    </SafeScreen>
  );
}
