import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  Card,
  Button,
  SearchInput,
  EmptyState,
  Badge,
  FilterChip,
  SafeScreen,
  colors,
  spacing,
} from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface InvoiceWithCustomer extends Invoice {
  customers: Customer;
}

export default function InvoicesPage() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch invoices with customer data
  const {
    data: invoices = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["invoices", searchQuery, statusFilter, customerId],
    queryFn: async (): Promise<InvoiceWithCustomer[]> => {
      let query = supabase
        .from("invoices")
        .select(
          `
          *,
          customers(*)
        `
        )
        .order("created_at", { ascending: false });

      // Filter by customer if specified
      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      // Filter by status
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Search filter
      if (searchQuery.trim()) {
        query = query.or(`invoice_number.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as InvoiceWithCustomer[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleCreateInvoice = () => {
    router.push("/invoices/create" as any);
  };

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}` as any);
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/customers/${customerId}` as any);
  };

  const getStatusVariant = (
    status: string
  ): "primary" | "success" | "warning" | "error" | "secondary" => {
    switch (status.toLowerCase()) {
      case "draft":
        return "secondary";
      case "sent":
        return "warning";
      case "paid":
        return "success";
      case "overdue":
        return "error";
      case "cancelled":
        return "error";
      default:
        return "secondary";
    }
  };

  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Sent", value: "sent" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const renderInvoiceCard = ({
    item: invoice,
  }: {
    item: InvoiceWithCustomer;
  }) => (
    <TouchableOpacity
      onPress={() => handleViewInvoice(invoice.id)}
      style={{ marginBottom: spacing[4] }}
    >
      <Card variant="elevated" padding={4}>
        <View style={{ gap: spacing[3] }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {invoice.invoice_number}
              </Text>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                Due:{" "}
                {invoice.due_date
                  ? new Date(invoice.due_date).toLocaleDateString()
                  : "No due date"}
              </Text>
            </View>
            <Badge
              label={invoice.status}
              variant={getStatusVariant(invoice.status)}
              size="sm"
            />
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.gray[400]}
              style={{ marginLeft: spacing[2] }}
            />
          </View>

          {/* Customer Info */}
          <TouchableOpacity
            onPress={() => handleViewCustomer(invoice.customer_id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
              padding: spacing[2],
              backgroundColor: colors.gray[50],
              borderRadius: 6,
            }}
          >
            <FontAwesome name="user" size={14} color={colors.primary[500]} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {invoice.customers.name}
              </Text>
              {invoice.customers.company_name && (
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  {invoice.customers.company_name}
                </Text>
              )}
            </View>
            <FontAwesome
              name="external-link"
              size={10}
              color={colors.gray[400]}
            />
          </TouchableOpacity>

          {/* Amount */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.primary[600],
                }}
              >
                ₹{invoice.amount.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                Issued: {new Date(invoice.issue_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeScreen>
        <Header
          title="Invoices"
          subtitle="Manage your invoices"
          rightElement={
            <Button
              title="Add Invoice"
              onPress={handleCreateInvoice}
              variant="primary"
              size="sm"
              icon="plus"
            />
          }
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Invoices"
            description="Fetching invoice data..."
          />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <Header
        title="Invoices"
        subtitle={
          customerId ? "Customer Invoices" : `${invoices.length} invoices`
        }
        onBack={customerId ? () => router.back() : undefined}
        rightElement={
          <Button
            title="Add Invoice"
            onPress={handleCreateInvoice}
            variant="primary"
            size="sm"
            icon="plus"
          />
        }
      />

      <View style={{ padding: spacing[6], paddingBottom: 0 }}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search invoices by invoice number..."
        />

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing[4] }}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {statusOptions.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={statusFilter === option.value}
              onPress={() => setStatusFilter(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      {invoices.length === 0 && !isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="file-text"
            title={
              searchQuery || statusFilter !== "all"
                ? "No invoices found"
                : "No invoices yet"
            }
            description={
              searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first invoice to get started"
            }
            actionLabel={
              searchQuery || statusFilter !== "all"
                ? "Clear Filters"
                : "Add Invoice"
            }
            onAction={() => {
              if (searchQuery || statusFilter !== "all") {
                setSearchQuery("");
                setStatusFilter("all");
              } else {
                handleCreateInvoice();
              }
            }}
          />
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderInvoiceCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing[6],
            paddingTop: spacing[4],
          }}
          refreshing={isRefetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
}
