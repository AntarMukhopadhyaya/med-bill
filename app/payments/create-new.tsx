import React, { useState } from "react";
import {
  View,
  ScrollView,
  Alert,
  Modal,
  TouchableOpacity,
  Text,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { HeaderWithSearch, spacing, colors } from "@/components/DesignSystem";
import {
  FormInput,
  FormButton,
  FormSection,
  FormContainer,
  FormPicker,
} from "@/components/FormComponents";
import { useToastHelpers } from "@/lib/toast";
import { Database } from "@/types/database.types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SearchBar } from "@/components/SearchBar";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

interface PaymentFormState {
  customer_id: string;
  amount: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  payment_date: string;
}

interface InvoiceAllocation {
  invoice_id: string;
  amount: number;
  invoice: Invoice;
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  // Payment method options
  const paymentMethods = [
    { label: "Cash", value: "cash" },
    { label: "Bank Transfer", value: "bank_transfer" },
    { label: "Credit Card", value: "credit_card" },
    { label: "Debit Card", value: "debit_card" },
    { label: "UPI", value: "upi" },
    { label: "Cheque", value: "cheque" },
    { label: "Other", value: "other" },
  ];

  // Fetch customers for selection
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: async (): Promise<Customer[]> => {
      let query = supabase.from("customers").select("*").order("name");

      if (customerSearch.trim()) {
        query = query.or(
          `name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%,company_name.ilike.%${customerSearch}%`
        );
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch customer's pending invoices
  const { data: customerInvoices = [] } = useQuery({
    queryKey: ["customer-invoices", formData.customer_id],
    queryFn: async (): Promise<Invoice[]> => {
      if (!formData.customer_id) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", formData.customer_id)
        .in("status", ["draft", "sent", "overdue", "partially_paid"])
        .order("issue_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.customer_id,
  });

  // Helper function to handle ledger updates
  const handleLedgerUpdates = async (
    customerId: string,
    amount: number,
    paymentId: string
  ) => {
    try {
      // Check if customer has a ledger
      const { data: existingLedger, error: ledgerFetchError } = await supabase
        .from("ledgers")
        .select("*")
        .eq("customer_id", customerId)
        .single();

      let ledgerId: string;

      if (ledgerFetchError && ledgerFetchError.code === "PGRST116") {
        // No ledger exists, create one
        const { data: newLedger, error: createError } = await supabase
          .from("ledgers")
          .insert({
            customer_id: customerId,
            opening_balance: 0,
            current_balance: amount, // Credit the payment amount
          } as any)
          .select()
          .single();

        if (createError) throw createError;
        ledgerId = (newLedger as any).id;
      } else if (existingLedger) {
        // Update existing ledger
        const newBalance = (existingLedger as any).current_balance + amount;

        // @ts-ignore - bypass generated types mismatch
        await supabase
          .from("ledgers")
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existingLedger as any).id);

        ledgerId = (existingLedger as any).id;
      } else {
        throw ledgerFetchError;
      }

      // Create ledger transaction
      await supabase.from("ledger_transactions").insert({
        ledger_id: ledgerId,
        amount: amount,
        transaction_type: "credit",
        reference_type: "payment",
        reference_id: paymentId,
        description: `Payment received - ${formData.payment_method}${formData.reference_number ? ` (Ref: ${formData.reference_number})` : ""}`,
      } as any);
    } catch (error) {
      console.error("Error updating ledger:", error);
      // Don't throw - payment should still succeed even if ledger fails
    }
  };

  // Create payment mutation with allocations and ledger updates
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormState) => {
      const paymentAmount = parseFloat(paymentData.amount);

      // Validate allocations don't exceed payment amount
      const totalAllocated = allocations.reduce(
        (sum, alloc) => sum + alloc.amount,
        0
      );
      if (totalAllocated > paymentAmount) {
        throw new Error("Allocation amount cannot exceed payment amount");
      }

      // Insert payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          customer_id: paymentData.customer_id,
          amount: paymentAmount,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          notes: paymentData.notes || null,
          payment_date: paymentData.payment_date,
        } as any)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Process allocations if any
      if (allocations.length > 0) {
        // Insert payment allocations
        const allocationInserts = allocations.map((alloc) => ({
          payment_id: (payment as any).id,
          invoice_id: alloc.invoice_id,
          amount: alloc.amount,
        }));

        const { error: allocError } = await supabase
          .from("payment_allocations")
          .insert(allocationInserts as any);

        if (allocError) throw allocError;

        // Update invoice statuses based on allocations
        for (const allocation of allocations) {
          const invoice = allocation.invoice;
          const currentPaid = (invoice as any).amount_paid || 0;
          const newAmountPaid = currentPaid + allocation.amount;
          const invoiceTotal = invoice.amount;

          let newStatus = invoice.status;
          if (newAmountPaid >= invoiceTotal) {
            newStatus = "paid";
          } else if (newAmountPaid > 0) {
            newStatus = "partially_paid";
          }

          // @ts-ignore - bypass generated types mismatch
          await supabase
            .from("invoices")
            .update({
              amount_paid: newAmountPaid,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", allocation.invoice_id);
        }
      }

      // Auto-create or update ledger for customer
      await handleLedgerUpdates(
        paymentData.customer_id,
        paymentAmount,
        (payment as any).id
      );

      return payment;
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

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

    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + alloc.amount,
      0
    );
    const paymentAmount = parseFloat(formData.amount);

    let message = `Record payment of ₹${paymentAmount.toLocaleString()} for ${selectedCustomer?.name || "selected customer"}?`;

    if (allocations.length > 0) {
      message += `\n\nAllocations:\n${allocations
        .map(
          (alloc) =>
            `• Invoice #${alloc.invoice.invoice_number}: ₹${alloc.amount.toLocaleString()}`
        )
        .join("\n")}`;

      if (totalAllocated < paymentAmount) {
        message += `\n\nUnallocated: ₹${(paymentAmount - totalAllocated).toLocaleString()}`;
      }
    }

    Alert.alert("Record Payment", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Record Payment",
        onPress: () => createPaymentMutation.mutate(formData),
      },
    ]);
  };

  const updateFormData = (field: keyof PaymentFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    updateFormData("customer_id", customer.id);
    setShowCustomerModal(false);
    setCustomerSearch("");
    // Clear allocations when customer changes
    setAllocations([]);
  };

  const calculateTotalOutstanding = () => {
    return customerInvoices.reduce((total, invoice) => {
      const amountPaid = (invoice as any).amount_paid || 0;
      return total + (invoice.amount - amountPaid);
    }, 0);
  };

  const addAllocation = (invoice: Invoice, amount: number) => {
    const existingIndex = allocations.findIndex(
      (a) => a.invoice_id === invoice.id
    );

    if (existingIndex >= 0) {
      // Update existing allocation
      const newAllocations = [...allocations];
      newAllocations[existingIndex].amount = amount;
      setAllocations(newAllocations);
    } else {
      // Add new allocation
      setAllocations((prev) => [
        ...prev,
        {
          invoice_id: invoice.id,
          amount: amount,
          invoice: invoice,
        },
      ]);
    }
  };

  const removeAllocation = (invoiceId: string) => {
    setAllocations((prev) => prev.filter((a) => a.invoice_id !== invoiceId));
  };

  const getAllocatedAmount = (invoiceId: string) => {
    const allocation = allocations.find((a) => a.invoice_id === invoiceId);
    return allocation ? allocation.amount : 0;
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  };

  const getRemainingAmount = () => {
    const paymentAmount = parseFloat(formData.amount) || 0;
    return paymentAmount - getTotalAllocated();
  };

  return (
    <View style={{ flex: 1 }}>
      <HeaderWithSearch
        title="Record Payment"
        searchValue=""
        onSearchChange={() => {}}
        placeholder=""
        showAddButton={false}
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
      >
        <FormContainer onSubmit={handleSubmit}>
          <FormSection title="Payment Details">
            {/* Customer Selection */}
            <TouchableOpacity
              onPress={() => setShowCustomerModal(true)}
              style={{
                borderWidth: 1,
                borderColor: errors.customer_id
                  ? colors.error[500]
                  : colors.gray[300],
                borderRadius: 8,
                padding: spacing[4],
                backgroundColor: colors.white,
                marginBottom: spacing[4],
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[600],
                  marginBottom: 4,
                }}
              >
                Customer *
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: selectedCustomer
                      ? colors.gray[900]
                      : colors.gray[500],
                    fontSize: 16,
                  }}
                >
                  {selectedCustomer ? selectedCustomer.name : "Select customer"}
                </Text>
                <FontAwesome
                  name="chevron-down"
                  size={16}
                  color={colors.gray[400]}
                />
              </View>
              {selectedCustomer?.company_name && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[500],
                    marginTop: 2,
                  }}
                >
                  {selectedCustomer.company_name}
                </Text>
              )}
            </TouchableOpacity>
            {errors.customer_id && (
              <Text
                style={{
                  color: colors.error[500],
                  fontSize: 12,
                  marginTop: -spacing[3],
                  marginBottom: spacing[3],
                }}
              >
                {errors.customer_id}
              </Text>
            )}

            {/* Outstanding Balance Info */}
            {customerInvoices.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.warning[50],
                  padding: spacing[4],
                  borderRadius: 8,
                  marginBottom: spacing[4],
                  borderLeftWidth: 4,
                  borderLeftColor: colors.warning[500],
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{ fontWeight: "600", color: colors.warning[600] }}
                  >
                    Outstanding Invoices
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAllocationModal(true)}
                    style={{
                      backgroundColor: colors.primary[500],
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[1],
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.white,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      Allocate
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.warning[600], fontSize: 14 }}>
                  {customerInvoices.length} pending invoice
                  {customerInvoices.length > 1 ? "s" : ""} • Total: ₹
                  {calculateTotalOutstanding().toLocaleString()}
                </Text>
                {allocations.length > 0 && (
                  <View
                    style={{
                      marginTop: spacing[3],
                      paddingTop: spacing[3],
                      borderTopWidth: 1,
                      borderTopColor: colors.warning[300],
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        color: colors.success[600],
                        marginBottom: 2,
                      }}
                    >
                      Allocated: ₹{getTotalAllocated().toLocaleString()}
                    </Text>
                    {allocations.map((alloc) => (
                      <Text
                        key={alloc.invoice_id}
                        style={{ fontSize: 12, color: colors.gray[600] }}
                      >
                        • Invoice #{alloc.invoice.invoice_number}: ₹
                        {alloc.amount.toLocaleString()}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            <FormInput
              label="Amount"
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              placeholder="Enter payment amount"
              keyboardType="numeric"
              error={errors.amount}
              required
              leftIcon="cash"
            />

            {formData.amount && getRemainingAmount() !== 0 && (
              <View
                style={{
                  backgroundColor:
                    getRemainingAmount() > 0
                      ? colors.success[50]
                      : colors.error[50],
                  padding: spacing[3],
                  borderRadius: 6,
                  marginBottom: spacing[4],
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color:
                      getRemainingAmount() > 0
                        ? colors.success[600]
                        : colors.error[600],
                  }}
                >
                  {getRemainingAmount() > 0
                    ? `Unallocated: ₹${getRemainingAmount().toLocaleString()}`
                    : `Over-allocated by: ₹${Math.abs(getRemainingAmount()).toLocaleString()}`}
                </Text>
              </View>
            )}

            <FormPicker
              label="Payment Method"
              value={formData.payment_method}
              onValueChange={(value) => updateFormData("payment_method", value)}
              options={paymentMethods}
              error={errors.payment_method}
              required
            />

            <FormInput
              label="Reference Number"
              value={formData.reference_number}
              onChangeText={(value) =>
                updateFormData("reference_number", value)
              }
              placeholder="Transaction ID, Check number, etc."
              leftIcon="text"
            />

            <FormInput
              label="Payment Date"
              value={formData.payment_date}
              onChangeText={(value) => updateFormData("payment_date", value)}
              placeholder="YYYY-MM-DD"
              error={errors.payment_date}
              required
              leftIcon="calendar"
            />

            <FormInput
              label="Notes"
              value={formData.notes}
              onChangeText={(value) => updateFormData("notes", value)}
              placeholder="Additional notes about this payment"
              multiline
              numberOfLines={3}
              leftIcon="text"
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

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.white }}>
          <View
            style={{
              paddingTop: spacing[12],
              paddingHorizontal: spacing[6],
              paddingBottom: spacing[4],
              borderBottomWidth: 1,
              borderBottomColor: colors.gray[200],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing[4],
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                Select Customer
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomerModal(false)}
                style={{
                  padding: spacing[2],
                  borderRadius: 8,
                  backgroundColor: colors.gray[100],
                }}
              >
                <FontAwesome name="times" size={16} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <SearchBar
              value={customerSearch}
              onChange={setCustomerSearch}
              placeholder="Search customers..."
            />
          </View>

          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing[6] }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleCustomerSelect(item)}
                style={{
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.gray[200],
                  borderRadius: 8,
                  padding: spacing[4],
                  marginBottom: spacing[3],
                }}
              >
                <Text
                  style={{
                    fontWeight: "600",
                    color: colors.gray[900],
                    marginBottom: 2,
                  }}
                >
                  {item.name}
                </Text>
                {item.company_name && (
                  <Text
                    style={{
                      color: colors.gray[600],
                      fontSize: 14,
                      marginBottom: 2,
                    }}
                  >
                    {item.company_name}
                  </Text>
                )}
                <Text style={{ color: colors.gray[500], fontSize: 12 }}>
                  {item.phone} {item.email ? `• ${item.email}` : ""}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", padding: spacing[8] }}>
                <FontAwesome name="users" size={48} color={colors.gray[400]} />
                <Text
                  style={{ color: colors.gray[500], marginTop: spacing[4] }}
                >
                  {customerSearch
                    ? "No customers found"
                    : "Loading customers..."}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Invoice Allocation Modal */}
      <Modal
        visible={showAllocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.white }}>
          <View
            style={{
              paddingTop: spacing[12],
              paddingHorizontal: spacing[6],
              paddingBottom: spacing[4],
              borderBottomWidth: 1,
              borderBottomColor: colors.gray[200],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing[4],
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                Allocate Payment
              </Text>
              <TouchableOpacity
                onPress={() => setShowAllocationModal(false)}
                style={{
                  padding: spacing[2],
                  borderRadius: 8,
                  backgroundColor: colors.gray[100],
                }}
              >
                <FontAwesome name="times" size={16} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing[4],
              }}
            >
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                Payment Amount: ₹
                {parseFloat(formData.amount || "0").toLocaleString()}
              </Text>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                Remaining: ₹{getRemainingAmount().toLocaleString()}
              </Text>
            </View>
          </View>

          <FlatList
            data={customerInvoices}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing[6] }}
            renderItem={({ item }) => {
              const amountPaid = (item as any).amount_paid || 0;
              const outstanding = item.amount - amountPaid;
              const allocated = getAllocatedAmount(item.id);

              return (
                <View
                  style={{
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor:
                      allocated > 0 ? colors.primary[300] : colors.gray[200],
                    borderRadius: 8,
                    padding: spacing[4],
                    marginBottom: spacing[3],
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: spacing[3],
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontWeight: "600",
                          color: colors.gray[900],
                          marginBottom: 2,
                        }}
                      >
                        Invoice #{item.invoice_number}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.gray[600],
                          marginBottom: 2,
                        }}
                      >
                        Date: {new Date(item.issue_date).toLocaleDateString()}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                        Outstanding: ₹{outstanding.toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontWeight: "700",
                          fontSize: 16,
                          color: colors.gray[900],
                        }}
                      >
                        ₹{item.amount.toLocaleString()}
                      </Text>
                      {amountPaid > 0 && (
                        <Text
                          style={{ fontSize: 12, color: colors.success[600] }}
                        >
                          Paid: ₹{amountPaid.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[3],
                    }}
                  >
                    <FormInput
                      label=""
                      value={allocated > 0 ? allocated.toString() : ""}
                      onChangeText={(value) => {
                        const amount = parseFloat(value) || 0;
                        if (amount > 0 && amount <= outstanding) {
                          addAllocation(item, amount);
                        } else if (amount === 0) {
                          removeAllocation(item.id);
                        }
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        addAllocation(
                          item,
                          Math.min(
                            outstanding,
                            getRemainingAmount() + allocated
                          )
                        )
                      }
                      style={{
                        backgroundColor: colors.primary[500],
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: colors.white, fontSize: 12 }}>
                        Full
                      </Text>
                    </TouchableOpacity>
                    {allocated > 0 && (
                      <TouchableOpacity
                        onPress={() => removeAllocation(item.id)}
                        style={{
                          backgroundColor: colors.error[500],
                          paddingHorizontal: spacing[3],
                          paddingVertical: spacing[2],
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: colors.white, fontSize: 12 }}>
                          Clear
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", padding: spacing[8] }}>
                <FontAwesome
                  name="file-text-o"
                  size={48}
                  color={colors.gray[400]}
                />
                <Text
                  style={{ color: colors.gray[500], marginTop: spacing[4] }}
                >
                  No outstanding invoices
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}
