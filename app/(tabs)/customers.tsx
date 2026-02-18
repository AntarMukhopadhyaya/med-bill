import { CustomerFilters } from "@/components/customers/CustomerFilters";
import { CustomerList } from "@/components/customers/CustomerList";
import { StandardPage, StandardHeader } from "@/components/layout";
import { VStack } from "@/components/ui/vstack";

import { useToastHelpers } from "@/lib/toast";
import type { Customer } from "@/types/customers";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useInfiniteCustomers } from "@/hooks/useInfiniteCustomers";
import { useCustomerDeleteMutation } from "@/hooks/useCustomers";
import { Alert } from "react-native";
export default function CustomerManagement() {
  const { showSuccess, showError } = useToastHelpers();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "last_order">(
    "created_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const {
    data,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteCustomers({
    searchQuery,
    sortBy,
    sortOrder,
    filterStatus,
  });

  // Delete customer mutation
  const deleteCustomerMutation = useCustomerDeleteMutation();

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      "Delete Customer",
      `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteCustomerMutation.mutate(customer.id, {
              onSuccess: () => {
                showSuccess("Customer deleted successfully");
              },
              onError: (error) => {
                showError(
                  "Error deleting customer",
                  (error as any)?.message || "An unexpected error occurred."
                );
              },
            }),
        },
      ]
    );
  };
  const customers = useMemo<Customer[]>(
    () => (data?.pages.flat() as Customer[]) ?? [],
    [data]
  );
  return (
    <StandardPage refreshing={isRefetching} onRefresh={refetch}>
      <StandardHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search customers by name, email, or phone..."
        showAddButton={true}
        onAddPress={() => router.push("/customers/create")}
        showFiltersButton={true}
        onFiltersPress={() => setShowFilters(!showFilters)}
      />

      {/* Filters */}
      {showFilters && (
        <VStack className="bg-white px-6 py-4 border-b border-gray-200">
          <CustomerFilters
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        </VStack>
      )}

      {/* Customer List */}
      <CustomerList
        customers={customers}
        isRefetching={isRefetching}
        refetch={refetch}
        onDeleteCustomer={handleDeleteCustomer}
        searchQuery={searchQuery}
        filterStatus={filterStatus}
        isLoading={isLoading}
        onLoadMore={() => {
          if (hasNextPage) fetchNextPage();
        }}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </StandardPage>
  );
}
