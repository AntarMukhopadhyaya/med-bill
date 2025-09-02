import React, { useState, useCallback, useMemo, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  InvoiceWithCustomer,
  StatusOption,
  InvoicesPageParams,
} from "@/types/invoice";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";
import { InvoiceFilters } from "@/components/invoices/InvoiceFilters";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import { VStack, LoadingSpinner } from "@/components/DesignSystem";
import { StandardPage, StandardHeader } from "@/components/layout";

export default function InvoicesPage() {
  const { customerId } = useLocalSearchParams() as InvoicesPageParams;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

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

      // Enhanced search filter
      if (debouncedSearchQuery.trim()) {
        const { data: matchingCustomers } = await supabase
          .from("customers")
          .select("id")
          .or(
            `name.ilike.%${debouncedSearchQuery}%,company_name.ilike.%${debouncedSearchQuery}%`
          );

        const customerIds =
          (matchingCustomers as { id: string }[])?.map((c) => c.id) || [];

        if (customerIds.length > 0) {
          query = query.or(
            `invoice_number.ilike.%${debouncedSearchQuery}%,customer_id.in.(${customerIds.join(
              ","
            )})`
          );
        } else {
          query = query.ilike("invoice_number", `%${debouncedSearchQuery}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as InvoiceWithCustomer[];
    },
    staleTime: 2 * 60 * 1000,
  });

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
        isRefetching={isRefetching}
        refetch={refetch}
        onViewInvoice={handleViewInvoice}
        onViewCustomer={handleViewCustomer}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        isLoading={isLoading}
        onCreateInvoice={handleCreateInvoice}
        onClearFilters={handleClearFilters}
      />
    </StandardPage>
  );
}
