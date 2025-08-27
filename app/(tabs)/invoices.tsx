import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  Card,
  Button,
  EmptyState,
  Badge,
  FilterChip,
  SafeScreen,
  LoadingSpinner,
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
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search query to prevent keyboard closing
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query updates
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch invoices with customer data
  const {
    data: invoices = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["invoices", debouncedSearchQuery, statusFilter, customerId],
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

      // Enhanced search filter - search both invoice number and customer name
      if (debouncedSearchQuery.trim()) {
        // First get customers that match the search query
        const { data: matchingCustomers } = await supabase
          .from("customers")
          .select("id")
          .or(
            `name.ilike.%${debouncedSearchQuery}%,company_name.ilike.%${debouncedSearchQuery}%`
          );

        const customerIds =
          (matchingCustomers as { id: string }[])?.map((c) => c.id) || [];

        // Then search both invoice numbers and customer IDs
        if (customerIds.length > 0) {
          query = query.or(
            `invoice_number.ilike.%${debouncedSearchQuery}%,customer_id.in.(${customerIds.join(",")})`
          );
        } else {
          // If no customers match, just search invoice numbers
          query = query.ilike("invoice_number", `%${debouncedSearchQuery}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as InvoiceWithCustomer[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleCreateInvoice = useCallback(() => {
    router.push("/invoices/create" as any);
  }, []);

  const handleViewInvoice = useCallback((invoiceId: string) => {
    router.push(`/invoices/${invoiceId}` as any);
  }, []);

  const handleViewCustomer = useCallback((customerId: string) => {
    router.push(`/customers/${customerId}` as any);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const getStatusVariant = useCallback(
    (
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
    },
    []
  );

  const statusOptions = useMemo(
    () => [
      { key: "all", label: "All Invoices", icon: "file-text-o" },
      { key: "draft", label: "Draft", icon: "edit" },
      { key: "sent", label: "Sent", icon: "paper-plane" },
      { key: "paid", label: "Paid", icon: "check-circle" },
      { key: "overdue", label: "Overdue", icon: "exclamation-triangle" },
      { key: "cancelled", label: "Cancelled", icon: "times-circle" },
    ],
    []
  );

  const renderInvoiceCard = useCallback(
    ({ item: invoice }: { item: InvoiceWithCustomer }) => (
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
                  numberOfLines={1}
                  ellipsizeMode="tail"
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
    ),
    [handleViewInvoice, handleViewCustomer, getStatusVariant]
  );

  return (
    <SafeScreen>
      <Header
        title="Invoices"
        subtitle={
          customerId ? "Customer Invoices" : `${invoices.length} invoices`
        }
        onBack={customerId ? () => router.back() : undefined}
        rightElement={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                backgroundColor: colors.gray[100],
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                borderRadius: 8,
                marginRight: spacing[2],
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <FontAwesome name="filter" size={14} color={colors.gray[600]} />
            </TouchableOpacity>
            <Button
              title="Add Invoice"
              onPress={handleCreateInvoice}
              variant="primary"
              size="sm"
              icon="plus"
            />
          </View>
        }
      />

      <View style={{ padding: spacing[6], paddingBottom: 0 }}>
        {/* Search */}
        <View className="relative mb-4">
          <FontAwesome
            name="search"
            size={16}
            color="#9CA3AF"
            style={{ position: "absolute", left: 12, top: 12, zIndex: 1 }}
          />
          <TextInput
            className="bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-3"
            placeholder="Search by invoice number, customer name..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            blurOnSubmit={false}
          />
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={{ marginBottom: spacing[4] }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: colors.gray[700],
                marginBottom: spacing[2],
              }}
            >
              Filter by Status
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setStatusFilter(option.key)}
                  style={{
                    marginRight: spacing[3],
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[2],
                    borderRadius: 8,
                    borderWidth: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor:
                      statusFilter === option.key
                        ? colors.primary[500]
                        : "white",
                    borderColor:
                      statusFilter === option.key
                        ? colors.primary[500]
                        : colors.gray[300],
                  }}
                >
                  <FontAwesome
                    name={option.icon as any}
                    size={14}
                    color={
                      statusFilter === option.key ? "white" : colors.gray[600]
                    }
                  />
                  <Text
                    style={{
                      marginLeft: spacing[2],
                      fontWeight: "500",
                      color:
                        statusFilter === option.key
                          ? "white"
                          : colors.gray[700],
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Content Area with Loading State */}
      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LoadingSpinner
            size="large"
            message="Loading invoices..."
            variant="default"
          />
        </View>
      ) : invoices.length === 0 ? (
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
                setDebouncedSearchQuery("");
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
