import React, { useState, useMemo } from "react";
import { ScrollView, Modal, RefreshControl, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text as UIText } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Database } from "@/types/database.types";
import {
  generateLedgerPdf,
  writeLedgerPdfToFile,
  uploadLedgerPdfToSupabase,
  shareLedgerPdf,
} from "@/lib/ledgerPdf";
import { useToast } from "@/lib/toast";
import { BadgeText } from "@/components/ui/badge";
import {
  ledgerTransactionSchema,
  type LedgerTransactionFormData,
} from "@/lib/validation";
import { StandardHeader, StandardPage } from "@/components/layout";

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
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null); // when set, modal is in edit mode
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<LedgerTransactionFormData>({
    resolver: zodResolver(ledgerTransactionSchema),
    defaultValues: {
      amount: "",
      transaction_type: "debit",
      description: "",
      reference_type: "",
      reference_id: "",
    },
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
    mutationFn: async (transactionData: LedgerTransactionFormData) => {
      if (!ledger?.id) throw new Error("Ledger not found");

      const insertData = {
        ledger_id: ledger.id,
        amount: parseFloat(transactionData.amount),
        transaction_type: transactionData.transaction_type,
        description: transactionData.description,
        reference_type: transactionData.reference_type || null,
        reference_id: transactionData.reference_id || null,
        transaction_date: new Date().toISOString(),
      };

      const { data, error } = await (supabase as any)
        .from("ledger_transactions")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, transactionData) => {
      // Update ledger current balance
      if (ledger) {
        const newBalance =
          transactionData.transaction_type === "debit"
            ? ledger.current_balance + parseFloat(transactionData.amount)
            : ledger.current_balance - parseFloat(transactionData.amount);

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
      reset(); // Reset form using React Hook Form

      toast.showSuccess(
        "Transaction Added",
        "Ledger transaction recorded successfully"
      );
    },
    onError: (error: any) => {
      toast.showError("Error", error.message || "Failed to add transaction");
      console.error("Transaction addition error:", error);
    },
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async (payload: {
      form: LedgerTransactionFormData;
      original: TransactionWithDetails;
    }) => {
      if (!ledger?.id) throw new Error("Ledger not found");
      const { form, original } = payload;
      const newAmount = parseFloat(form.amount);
      if (isNaN(newAmount)) throw new Error("Invalid amount");

      // Update record
      const { data, error } = await (supabase as any)
        .from("ledger_transactions")
        .update({
          amount: newAmount,
          transaction_type: form.transaction_type,
          description: form.description,
          reference_type: form.reference_type || null,
          reference_id: form.reference_id || null,
        })
        .eq("id", original.id)
        .select()
        .single();
      if (error) throw error;
      return { updated: data, original };
    },
    onSuccess: async ({ updated, original }, { form }) => {
      if (ledger) {
        // Reverse old effect, apply new effect
        const oldEffect =
          original.transaction_type === "debit"
            ? original.amount
            : -original.amount;
        const newEffect =
          form.transaction_type === "debit"
            ? parseFloat(form.amount)
            : -parseFloat(form.amount);
        const delta = newEffect - oldEffect;
        const newBalance = ledger.current_balance + delta;
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
      setEditingTransaction(null);
      setShowAddTransaction(false);
      reset();
      toast.showSuccess("Transaction Updated", "Ledger transaction updated");
    },
    onError: (error: any) => {
      toast.showError(
        "Update Failed",
        error.message || "Could not update transaction"
      );
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transaction: TransactionWithDetails) => {
      if (!ledger?.id) throw new Error("Ledger not found");
      const { error } = await (supabase as any)
        .from("ledger_transactions")
        .delete()
        .eq("id", transaction.id);
      if (error) throw error;
      return transaction;
    },
    onSuccess: async (transaction) => {
      if (ledger) {
        const effect =
          transaction.transaction_type === "debit"
            ? transaction.amount
            : -transaction.amount;
        const newBalance = ledger.current_balance - effect; // reverse effect
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
      toast.showSuccess("Transaction Deleted", "Ledger transaction removed");
    },
    onError: (error: any) => {
      toast.showError(
        "Delete Failed",
        error.message || "Could not delete transaction"
      );
    },
  });

  const handleEditInitiate = (t: TransactionWithDetails) => {
    setEditingTransaction(t);
    // preload form
    reset({
      amount: t.amount.toString(),
      transaction_type: t.transaction_type as any,
      description: t.description || "",
      reference_type: (t.reference_type as any) || "",
      reference_id: (t.reference_id as any) || "",
    });
    setShowAddTransaction(true);
  };

  const handleUpdateTransaction = (data: LedgerTransactionFormData) => {
    if (!editingTransaction) return;
    updateTransactionMutation.mutate({
      form: data,
      original: editingTransaction,
    });
  };

  const handleDeleteTransaction = (t: TransactionWithDetails) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTransactionMutation.mutate(t),
        },
      ]
    );
  };

  const handleGeneratePdf = async () => {
    if (!ledger || !ledger.customer) return;

    try {
      setIsGeneratingPdf(true);
      toast.showInfo("Generating PDF", "Creating ledger PDF...");

      const pdfBytes = await generateLedgerPdf({
        customer: ledger.customer,
        transactions,
        dateRange,
        openingBalance: balanceInfo.openingBalance,
        logo: require("@/assets/images/icon.png"),
      });

      const filename = `ledger-${ledger.customer.name.replace(/\s+/g, "-")}-${
        dateRange.from
      }-to-${dateRange.to}.pdf`;
      const filePath = await writeLedgerPdfToFile(pdfBytes, filename);

      // Upload to Supabase
      await uploadLedgerPdfToSupabase(filePath, "ledgers");

      toast.showSuccess("PDF Generated", "Ledger PDF created successfully");

      // Share the PDF
      await shareLedgerPdf(filePath);
    } catch (error: any) {
      toast.showError("PDF Error", error.message || "Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAddTransaction = (data: LedgerTransactionFormData) => {
    addTransactionMutation.mutate(data);
  };

  const TransactionCard = ({
    transaction,
  }: {
    transaction: TransactionWithDetails;
    index: number;
  }) => (
    <Card variant="elevated" className="p-3 mb-2">
      <HStack className="justify-between items-start">
        <VStack className="flex-1">
          <HStack className="items-center mb-1 gap-2">
            <Badge
              variant={
                transaction.transaction_type === "debit" ? "error" : "success"
              }
              size="sm"
            >
              <BadgeText>
                {transaction.transaction_type === "debit" ? "Dr" : "Cr"}
              </BadgeText>
            </Badge>
            <UIText className="text-xs text-typography-600">
              {new Date(transaction.transaction_date).toLocaleDateString()}
            </UIText>
          </HStack>
          <UIText className="text-sm font-medium text-typography-900 mb-1">
            {transaction.description}
          </UIText>
          {transaction.reference_type && (
            <UIText className="text-xs text-typography-500">
              Ref: {transaction.reference_type} - {transaction.reference_id}
            </UIText>
          )}
          <HStack className="gap-3 mt-2">
            <Pressable
              onPress={() => handleEditInitiate(transaction)}
              className="px-2 py-1 rounded bg-primary-50"
            >
              <UIText className="text-[11px] font-medium text-primary-600">
                Edit
              </UIText>
            </Pressable>
            <Pressable
              onPress={() => handleDeleteTransaction(transaction)}
              className="px-2 py-1 rounded bg-error-50"
            >
              <UIText className="text-[11px] font-medium text-error-600">
                Delete
              </UIText>
            </Pressable>
          </HStack>
        </VStack>
        <VStack className="items-end">
          <UIText
            className={`text-base font-semibold ${
              transaction.transaction_type === "debit"
                ? "text-error-600"
                : "text-success-600"
            }`}
          >
            ₹{transaction.amount.toLocaleString()}
          </UIText>
        </VStack>
      </HStack>
    </Card>
  );

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
    <StandardPage>
      <StandardHeader
        title="Ledger"
        subtitle={ledger.customer?.name || "Unknown Customer"}
        showBackButton={true}
        showAddButton={true}
        onAddPress={() => {
          setEditingTransaction(null); // ensure add mode
          reset({
            amount: "",
            transaction_type: "debit",
            description: "",
            reference_type: "",
            reference_id: "",
          });
          setShowAddTransaction(true);
        }}
      />
      <VStack className="flex-1 bg-background">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={transactionsLoading}
              onRefresh={refetch}
            />
          }
        >
          {/* Customer Info */}
          <Card variant="elevated" className="p-4 mb-4">
            <SectionHeader title="Customer Information" />
            <VStack className="gap-2">
              <UIText className="text-base font-semibold text-typography-900">
                {ledger.customer.name}
              </UIText>
              {ledger.customer.company_name && (
                <UIText className="text-sm text-typography-600">
                  {ledger.customer.company_name}
                </UIText>
              )}
              <UIText className="text-xs text-typography-500">
                Phone: {ledger.customer.phone} | Email: {ledger.customer.email}
              </UIText>
              {ledger.customer.gstin && (
                <UIText className="text-xs text-typography-500">
                  GSTIN: {ledger.customer.gstin}
                </UIText>
              )}
            </VStack>
          </Card>

          {/* Balance Summary */}
          <Card variant="elevated" className="p-4 mb-4">
            <SectionHeader title="Balance Summary" />
            <HStack className="flex-wrap gap-4">
              <VStack className="flex-1 min-w-[120px]">
                <UIText className="text-xs text-typography-600 mb-1">
                  Opening Balance
                </UIText>
                <UIText className="text-lg font-bold text-primary-600">
                  ₹{balanceInfo.openingBalance.toLocaleString()}
                </UIText>
              </VStack>
              <VStack className="flex-1 min-w-[120px]">
                <UIText className="text-xs text-typography-600 mb-1">
                  Total Debits
                </UIText>
                <UIText className="text-lg font-bold text-error-600">
                  ₹{balanceInfo.totalDebits.toLocaleString()}
                </UIText>
              </VStack>
              <VStack className="flex-1 min-w-[120px]">
                <UIText className="text-xs text-typography-600 mb-1">
                  Total Credits
                </UIText>
                <UIText className="text-lg font-bold text-success-600">
                  ₹{balanceInfo.totalCredits.toLocaleString()}
                </UIText>
              </VStack>
              <VStack className="flex-1 min-w-[120px]">
                <UIText className="text-xs text-typography-600 mb-1">
                  Current Balance
                </UIText>
                <UIText
                  className={`text-xl font-bold ${
                    balanceInfo.closingBalance >= 0
                      ? "text-success-600"
                      : "text-error-600"
                  }`}
                >
                  ₹{Math.abs(balanceInfo.closingBalance).toLocaleString()}
                  <UIText className="text-sm">
                    {balanceInfo.closingBalance >= 0 ? " Dr" : " Cr"}
                  </UIText>
                </UIText>
              </VStack>
            </HStack>
          </Card>

          {/* Date Range and Actions */}
          <Card variant="elevated" className="p-4 mb-4">
            <SectionHeader title="Date Range & Actions" />
            <VStack className="gap-4">
              <HStack className="gap-4">
                <VStack className="flex-1">
                  <VStack className="gap-2">
                    <UIText className="text-sm font-medium text-typography-700">
                      From Date
                    </UIText>
                    <Input>
                      <InputField
                        placeholder="YYYY-MM-DD"
                        value={dateRange.from}
                        onChangeText={(value: string) =>
                          setDateRange((prev) => ({ ...prev, from: value }))
                        }
                        className="bg-background-0 border border-outline-300"
                      />
                    </Input>
                  </VStack>
                </VStack>
                <VStack className="flex-1">
                  <VStack className="gap-2">
                    <UIText className="text-sm font-medium text-typography-700">
                      To Date
                    </UIText>
                    <Input>
                      <InputField
                        placeholder="YYYY-MM-DD"
                        value={dateRange.to}
                        onChangeText={(value: string) =>
                          setDateRange((prev) => ({ ...prev, to: value }))
                        }
                        className="bg-background-0 border border-outline-300"
                      />
                    </Input>
                  </VStack>
                </VStack>
              </HStack>

              <HStack className="gap-4">
                <VStack className="flex-1">
                  <Button
                    title={isGeneratingPdf ? "Generating..." : "Generate PDF"}
                    onPress={handleGeneratePdf}
                    variant="primary"
                    icon="file-pdf-o"
                    disabled={isGeneratingPdf}
                  />
                </VStack>
                <VStack className="flex-1">
                  <Button
                    title="Refresh"
                    onPress={() => refetch()}
                    variant="outline"
                    icon="refresh"
                  />
                </VStack>
              </HStack>
            </VStack>
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
            <VStack className="gap-2">
              {transactions.map((transaction, index) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  index={index}
                />
              ))}
            </VStack>
          )}
        </ScrollView>

        {/* Add / Edit Transaction Modal */}
        <Modal
          visible={showAddTransaction}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeScreen>
            <VStack className="flex-1 bg-background">
              <Header
                title={
                  editingTransaction ? "Edit Transaction" : "Add Transaction"
                }
                rightElement={
                  <HStack className="gap-2">
                    <Button
                      title="Cancel"
                      onPress={() => setShowAddTransaction(false)}
                      variant="ghost"
                      icon="times"
                      size="sm"
                    />
                    <Button
                      title={editingTransaction ? "Update" : "Save"}
                      onPress={handleSubmit(
                        editingTransaction
                          ? handleUpdateTransaction
                          : handleAddTransaction
                      )}
                      variant="primary"
                      icon="check"
                      size="sm"
                      loading={
                        addTransactionMutation.isPending ||
                        updateTransactionMutation.isPending
                      }
                    />
                  </HStack>
                }
              />

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 24 }}
              >
                <VStack className="gap-6">
                  {/* Section Header */}
                  <UIText className="text-xl font-bold text-typography-900">
                    Transaction Details
                  </UIText>

                  {/* Amount Field */}
                  <VStack className="gap-2">
                    <UIText className="text-sm font-medium text-typography-700">
                      Amount *
                    </UIText>
                    <Controller
                      control={control}
                      name="amount"
                      render={({ field: { onChange, value } }) => (
                        <Input>
                          <InputField
                            placeholder="Enter amount"
                            value={value}
                            onChangeText={onChange}
                            keyboardType="numeric"
                            className="bg-background-0 border border-outline-300"
                          />
                        </Input>
                      )}
                    />
                    {errors.amount && (
                      <UIText className="text-sm text-error-600">
                        {errors.amount.message}
                      </UIText>
                    )}
                  </VStack>

                  {/* Transaction Type */}
                  <VStack className="gap-2">
                    <UIText className="text-sm font-medium text-typography-700">
                      Transaction Type *
                    </UIText>
                    <Controller
                      control={control}
                      name="transaction_type"
                      render={({ field: { onChange, value } }) => (
                        <HStack className="gap-3">
                          <Pressable
                            onPress={() => onChange("debit")}
                            className={`flex-1 rounded-lg border px-3 py-3 ${
                              value === "debit"
                                ? "border-error-500 bg-error-50"
                                : "border-outline-300 bg-background"
                            }`}
                          >
                            <UIText
                              className={`text-center font-medium text-sm ${
                                value === "debit"
                                  ? "text-error-600"
                                  : "text-typography-600"
                              }`}
                            >
                              Debit (Sale)
                            </UIText>
                          </Pressable>
                          <Pressable
                            onPress={() => onChange("credit")}
                            className={`flex-1 rounded-lg border px-3 py-3 ${
                              value === "credit"
                                ? "border-success-500 bg-success-50"
                                : "border-outline-300 bg-background"
                            }`}
                          >
                            <UIText
                              className={`text-center font-medium text-sm ${
                                value === "credit"
                                  ? "text-success-600"
                                  : "text-typography-600"
                              }`}
                            >
                              Credit (Payment)
                            </UIText>
                          </Pressable>
                        </HStack>
                      )}
                    />
                    {errors.transaction_type && (
                      <UIText className="text-sm text-error-600">
                        {errors.transaction_type.message}
                      </UIText>
                    )}
                  </VStack>

                  {/* Description Field */}
                  <VStack className="gap-2">
                    <UIText className="text-sm font-medium text-typography-700">
                      Description *
                    </UIText>
                    <Controller
                      control={control}
                      name="description"
                      render={({ field: { onChange, value } }) => (
                        <Input>
                          <InputField
                            placeholder="Enter transaction description"
                            value={value}
                            onChangeText={onChange}
                            multiline
                            numberOfLines={3}
                            className="bg-background-0 border border-outline-300"
                          />
                        </Input>
                      )}
                    />
                    {errors.description && (
                      <UIText className="text-sm text-error-600">
                        {errors.description.message}
                      </UIText>
                    )}
                  </VStack>

                  {/* Reference Type Field */}
                  <VStack className="gap-2">
                    <UIText className="text-sm font-medium text-typography-700">
                      Reference Type (Optional)
                    </UIText>
                    <Controller
                      control={control}
                      name="reference_type"
                      render={({ field: { onChange, value } }) => (
                        <Input>
                          <InputField
                            placeholder="e.g., Invoice, Order, Payment"
                            value={value || ""}
                            onChangeText={onChange}
                            className="bg-background-0 border border-outline-300"
                          />
                        </Input>
                      )}
                    />
                  </VStack>

                  {/* Reference ID Field */}
                  <VStack className="gap-2">
                    <UIText className="text-sm font-medium text-typography-700">
                      Reference ID (Optional)
                    </UIText>
                    <Controller
                      control={control}
                      name="reference_id"
                      render={({ field: { onChange, value } }) => (
                        <Input>
                          <InputField
                            placeholder="e.g., INV001, ORD123"
                            value={value || ""}
                            onChangeText={onChange}
                            className="bg-background-0 border border-outline-300"
                          />
                        </Input>
                      )}
                    />
                  </VStack>
                </VStack>
              </ScrollView>
            </VStack>
          </SafeScreen>
        </Modal>
      </VStack>
    </StandardPage>
  );
}
