import React, { useState, useCallback, useMemo, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  InvoiceWithCustomer,
  StatusOption,
  InvoicesPageParams,
} from "@/types/invoice";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";
import { InvoiceFilters } from "@/components/invoices/InvoiceFilters";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import LoadingSpinner from "@/components/LoadingSpinner";
import { StandardPage, StandardHeader } from "@/components/layout";
import { Alert } from "react-native";
import { useToastHelpers } from "@/lib/toast";
import { useInfiniteInvoices } from "@/hooks/useInfiniteInvoices";
import { useInvoiceDeleteMutation } from "@/hooks/useInvoices";
import { VStack } from "@/components/ui/vstack";

export default function InvoicesPage() {
  const { customerId } = useLocalSearchParams() as InvoicesPageParams;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { showSuccess, showError } = useToastHelpers();

  // Debounce search query updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Status options with memoization
  const statusOptions = useMemo<StatusOption[]>(
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

  // Fetch invoices with customer data using infinite query
  const {
    data,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteInvoices({
    searchQuery: debouncedSearchQuery,
    statusFilter,
    customerId: customerId || undefined,
  });

  const invoices: InvoiceWithCustomer[] = useMemo(
    () => (data?.pages.flat() ?? []) as InvoiceWithCustomer[],
    [data]
  );
  const deleteInvoiceMutation = useInvoiceDeleteMutation();

  const handleDeleteInvoice = (invoiceId: string) => {
    Alert.alert(
      "Delete Invoice",
      "Are you sure you want to delete this invoice?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteInvoiceMutation.mutate(invoiceId, {
              onSuccess: () => {
                showSuccess("Invoice deleted successfully");
              },
              onError: () => {
                showError("Failed to delete invoice");
              },
            }),
        },
      ]
    );
  };

  // Memoized handlers
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

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setStatusFilter("all");
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <StandardPage>
        <StandardHeader
          title="Invoices"
          subtitle="0 invoices"
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search invoices..."
          showAddButton={true}
          onAddPress={handleCreateInvoice}
        />
        <VStack
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LoadingSpinner
            size="large"
            message="Loading invoices..."
            variant="default"
          />
        </VStack>
      </StandardPage>
    );
  }

  return (
    <StandardPage refreshing={isRefetching} onRefresh={refetch}>
      <StandardHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices`}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search invoices..."
        showAddButton={true}
        onAddPress={handleCreateInvoice}
        showFiltersButton={true}
        onFiltersPress={toggleFilters}
      />

      {/* Filters */}
      {showFilters && (
        <VStack className="bg-white px-6 py-4 border-b border-gray-200">
          <InvoiceFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusOptions={statusOptions}
          />
        </VStack>
      )}

      <InvoiceList
        invoices={invoices}
        onDeleteInvoice={handleDeleteInvoice}
        isRefetching={isRefetching}
        refetch={refetch}
        onViewInvoice={handleViewInvoice}
        onViewCustomer={handleViewCustomer}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        isLoading={isLoading}
        onCreateInvoice={handleCreateInvoice}
        onClearFilters={handleClearFilters}
        onLoadMore={() => {
          if (hasNextPage) fetchNextPage();
        }}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </StandardPage>
  );
}
