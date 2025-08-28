import { CustomerFilters } from "@/components/customers/CustomerFilters";
import { CustomerList } from "@/components/customers/CustomerList";
import { LoadingSpinner, HeaderWithSearch } from "@/components/DesignSystem";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
type Customer = Database["public"]["Tables"]["customers"]["Row"];
export default function CustomerManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "last_order">(
    "created_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  const {
    data: customers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["customers", searchQuery, sortBy, sortOrder, filterStatus],
    queryFn: async (): Promise<Customer[]> => {
      let query = supabase.from("customers").select("*");

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        );
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      "Delete Customer",
      `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCustomerMutation.mutate(customer.id),
        },
      ]
    );
  };
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers;

    return filtered;
  }, [customers, filterStatus]);
  return (
    <View style={{ flex: 1 }}>
      {/* Header with Search */}
      <HeaderWithSearch
        title="Customers"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search customers by name, email, or phone..."
        showAddButton={true}
        onAddPress={() => router.push("/customers/create")}
        addButtonLabel="Add Customer"
        itemCount={filteredAndSortedCustomers.length}
        itemLabel="customers"
      />

      {/* Filters */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
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
      </View>

      {/* Customer List */}

      <CustomerList
        customers={filteredAndSortedCustomers}
        isRefetching={isRefetching}
        refetch={refetch}
        onDeleteCustomer={handleDeleteCustomer}
        searchQuery={searchQuery}
        filterStatus={filterStatus}
        isLoading={isLoading}
      />

      {/* Loading Spinner Overlay */}
      {isLoading && (
        <View className="absolute inset-0 bg-white bg-opacity-80 justify-center items-center">
          <LoadingSpinner />
        </View>
      )}
    </View>
  );
}
