import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  FlatList,
  Linking,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SafeScreen } from "@/components/DesignSystem";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

interface CustomerWithStats extends Customer {
  orders_count?: number;
  total_orders_value?: number;
  pending_amount?: number;
  last_order_date?: string;
}

export default function CustomerManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "last_order">(
    "created_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // Enhanced customer query
  const {
    data: customers = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["customers", sortBy, sortOrder],
    queryFn: async (): Promise<CustomerWithStats[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order(sortBy, { ascending: sortOrder === "asc" });

      if (error) throw error;
      return data || [];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Customer statistics query
  const { data: customerStats = {} } = useQuery({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "customer_id, total_amount, order_status, payment_status, created_at"
        );

      if (error) throw error;

      const stats: Record<string, any> = {};
      orders?.forEach((order: any) => {
        if (!stats[order.customer_id]) {
          stats[order.customer_id] = {
            orders_count: 0,
            total_orders_value: 0,
            pending_amount: 0,
            last_order_date: null,
          };
        }

        stats[order.customer_id].orders_count++;
        if (order.order_status === "completed") {
          stats[order.customer_id].total_orders_value += order.total_amount;
        }
        if (order.payment_status === "pending") {
          stats[order.customer_id].pending_amount += order.total_amount;
        }

        if (
          !stats[order.customer_id].last_order_date ||
          new Date(order.created_at) >
            new Date(stats[order.customer_id].last_order_date)
        ) {
          stats[order.customer_id].last_order_date = order.created_at;
        }
      });

      return stats;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Mutations

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      Alert.alert("Success", "Customer deleted successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete customer. Please try again.");
    },
  });

  // Create ledger for new customer
  const createLedgerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase.from("ledgers").insert({
        customer_id: customerId,
        opening_balance: 0,
        current_balance: 0,
      } as any);

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error("Failed to create ledger:", error);
    },
  });

  // Filtered and sorted customers
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        customer.company_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const stats = customerStats[customer.id];
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && stats?.orders_count > 0) ||
        (filterStatus === "inactive" && (!stats || stats.orders_count === 0)) ||
        (filterStatus === "pending_payment" && stats?.pending_amount > 0);

      return matchesSearch && matchesFilter;
    });

    // Add statistics to customers
    return filtered.map((customer) => ({
      ...customer,
      ...customerStats[customer.id],
    }));
  }, [customers, customerStats, searchQuery, filterStatus]);

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailCustomer = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      "Delete Customer",
      `Are you sure you want to delete "${customer.name}"? This will also delete all associated orders and data.`,
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

  const filterOptions = [
    { key: "all", label: "All Customers", icon: "users" },
    { key: "active", label: "Active", icon: "check-circle" },
    { key: "inactive", label: "Inactive", icon: "clock-o" },
    {
      key: "pending_payment",
      label: "Pending Payment",
      icon: "exclamation-triangle",
    },
  ];

  const sortOptions = [
    { key: "created_at", label: "Date Added" },
    { key: "name", label: "Name" },
    { key: "last_order", label: "Last Order" },
  ];

  const CustomerCard = ({ customer }: { customer: CustomerWithStats }) => {
    const hasOrders = (customer.orders_count || 0) > 0;
    const hasPendingPayments = (customer.pending_amount || 0) > 0;

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
        <TouchableOpacity
          onPress={() => {
            setSelectedCustomer(customer);
            setIsViewModalVisible(true);
          }}
        >
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <Text className="text-lg font-semibold text-gray-900 flex-1">
                  {customer.name}
                </Text>
                {hasPendingPayments && (
                  <View className="bg-orange-100 px-2 py-1 rounded-full">
                    <Text className="text-orange-600 text-xs font-medium">
                      Pending Payment
                    </Text>
                  </View>
                )}
              </View>

              {customer.company_name && (
                <Text className="text-sm text-gray-600 mb-1">
                  {customer.company_name}
                </Text>
              )}

              <View className="flex-row items-center mb-2">
                <FontAwesome name="phone" size={12} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-2">
                  {customer.phone}
                </Text>
              </View>

              {customer.email && (
                <View className="flex-row items-center mb-2">
                  <FontAwesome name="envelope" size={12} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">
                    {customer.email}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-sm font-medium text-gray-700">
                  Orders: {customer.orders_count || 0}
                </Text>
                <Text className="text-sm font-medium text-gray-700">
                  Total: ₹{(customer.total_orders_value || 0).toLocaleString()}
                </Text>
              </View>

              {hasPendingPayments && (
                <Text className="text-sm text-orange-600 font-medium mt-1">
                  Pending: ₹{(customer.pending_amount || 0).toLocaleString()}
                </Text>
              )}
            </View>

            <View className="flex-row ml-3">
              {customer.phone && (
                <TouchableOpacity
                  onPress={() => handleCallCustomer(customer.phone)}
                  className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-2"
                >
                  <FontAwesome name="phone" size={14} color="#10B981" />
                </TouchableOpacity>
              )}

              {customer.email && (
                <TouchableOpacity
                  onPress={() => handleEmailCustomer(customer.email!)}
                  className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2"
                >
                  <FontAwesome name="envelope" size={14} color="#3B82F6" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  router.push(`/customers/${customer.id}/edit`);
                }}
                className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2"
              >
                <FontAwesome name="edit" size={14} color="#3B82F6" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteCustomer(customer)}
                className="w-8 h-8 bg-red-100 rounded-full items-center justify-center"
              >
                <FontAwesome name="trash" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
            <Text className="text-xs text-gray-500">
              Added: {new Date(customer.created_at).toLocaleDateString()}
            </Text>
            {customer.last_order_date && (
              <Text className="text-xs text-gray-500">
                Last Order:{" "}
                {new Date(customer.last_order_date).toLocaleDateString()}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeScreen>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">
                Customers
              </Text>
              <Text className="text-sm text-gray-600">
                {filteredAndSortedCustomers.length} customers
              </Text>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                className="bg-gray-100 px-3 py-2 rounded-lg mr-2 flex-row items-center"
              >
                <FontAwesome name="filter" size={14} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/customers/create")}
                className="bg-primary-500 px-4 py-2 rounded-lg flex-row items-center"
              >
                <FontAwesome name="plus" size={16} color="white" />
                <Text className="text-white font-medium ml-2">
                  Add Customer
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
              placeholder="Search by name, email, phone, or company..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filters */}
          {showFilters && (
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {filterOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setFilterStatus(option.key)}
                      className={`mr-3 px-4 py-2 rounded-lg border flex-row items-center ${
                        filterStatus === option.key
                          ? "bg-primary-500 border-primary-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <FontAwesome
                        name={option.icon as any}
                        size={14}
                        color={
                          filterStatus === option.key ? "white" : "#6B7280"
                        }
                      />
                      <Text
                        className={`ml-2 font-medium ${
                          filterStatus === option.key
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </Text>
                <View className="flex-row items-center">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-1"
                  >
                    {sortOptions.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        onPress={() => setSortBy(option.key as any)}
                        className={`mr-3 px-3 py-2 rounded border ${
                          sortBy === option.key
                            ? "bg-primary-500 border-primary-500"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            sortBy === option.key
                              ? "text-white"
                              : "text-gray-700"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    onPress={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="bg-gray-100 p-2 rounded"
                  >
                    <FontAwesome
                      name={sortOrder === "asc" ? "sort-asc" : "sort-desc"}
                      size={16}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Customer List */}
        <FlatList
          data={filteredAndSortedCustomers}
          renderItem={({ item }) => <CustomerCard customer={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={() => (
            <View className="bg-white rounded-lg p-8 items-center">
              <FontAwesome name="users" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4 text-lg font-medium">
                No customers found
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Add your first customer to get started"}
              </Text>
              {!searchQuery && filterStatus === "all" && (
                <TouchableOpacity
                  onPress={() => router.push("/customers/create")}
                  className="bg-primary-500 px-6 py-3 rounded-lg mt-4"
                >
                  <Text className="text-white font-medium">
                    Add First Customer
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        {/* View Customer Modal */}
        <ViewCustomerModal
          visible={isViewModalVisible}
          customer={selectedCustomer}
          customerStats={
            selectedCustomer ? customerStats[selectedCustomer.id] : null
          }
          onClose={() => {
            setIsViewModalVisible(false);
            setSelectedCustomer(null);
          }}
          onEdit={() => {
            setIsViewModalVisible(false);
            if (selectedCustomer) {
              router.push(`/customers/${selectedCustomer.id}/edit`);
            }
          }}
        />
      </View>
    </SafeScreen>
  );
}

// View Customer Modal Component
interface ViewCustomerModalProps {
  visible: boolean;
  customer: Customer | null;
  customerStats: any;
  onClose: () => void;
  onEdit: () => void;
}

function ViewCustomerModal({
  visible,
  customer,
  customerStats,
  onClose,
  onEdit,
}: ViewCustomerModalProps) {
  if (!customer) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white">
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-bold text-gray-900">
              Customer Details
            </Text>
            <View className="flex-row">
              <TouchableOpacity onPress={onEdit} className="mr-4">
                <FontAwesome name="edit" size={24} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <FontAwesome name="times" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 p-6">
          {/* Customer Information */}
          <View className="bg-gray-50 p-4 rounded-lg mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              {customer.name}
            </Text>
            {customer.company_name && (
              <Text className="text-lg text-gray-700 mb-4">
                {customer.company_name}
              </Text>
            )}

            <View className="space-y-3">
              <View className="flex-row items-center">
                <FontAwesome name="phone" size={16} color="#6B7280" />
                <Text className="ml-3 text-gray-700">{customer.phone}</Text>
              </View>

              {customer.email && (
                <View className="flex-row items-center">
                  <FontAwesome name="envelope" size={16} color="#6B7280" />
                  <Text className="ml-3 text-gray-700">{customer.email}</Text>
                </View>
              )}

              {customer.gstin && (
                <View className="flex-row items-center">
                  <FontAwesome name="file-text" size={16} color="#6B7280" />
                  <Text className="ml-3 text-gray-700">
                    GSTIN: {customer.gstin}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Statistics */}
          {customerStats && (
            <View className="bg-blue-50 p-4 rounded-lg mb-6">
              <Text className="text-lg font-semibold text-blue-900 mb-3">
                Order Statistics
              </Text>
              <View className="grid grid-cols-2 gap-4">
                <View>
                  <Text className="text-sm text-blue-700">Total Orders</Text>
                  <Text className="text-xl font-bold text-blue-900">
                    {customerStats.orders_count || 0}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm text-blue-700">Total Value</Text>
                  <Text className="text-xl font-bold text-blue-900">
                    ₹{(customerStats.total_orders_value || 0).toLocaleString()}
                  </Text>
                </View>
                {customerStats.pending_amount > 0 && (
                  <View>
                    <Text className="text-sm text-orange-700">
                      Pending Payment
                    </Text>
                    <Text className="text-xl font-bold text-orange-900">
                      ₹{customerStats.pending_amount.toLocaleString()}
                    </Text>
                  </View>
                )}
                {customerStats.last_order_date && (
                  <View>
                    <Text className="text-sm text-blue-700">Last Order</Text>
                    <Text className="text-lg font-semibold text-blue-900">
                      {new Date(
                        customerStats.last_order_date
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Addresses */}
          {(customer.billing_address || customer.shipping_address) && (
            <View className="space-y-4">
              {customer.billing_address && (
                <View>
                  <Text className="text-lg font-semibold text-gray-900 mb-2">
                    Billing Address
                  </Text>
                  <Text className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {customer.billing_address}
                  </Text>
                </View>
              )}

              {customer.shipping_address && (
                <View>
                  <Text className="text-lg font-semibold text-gray-900 mb-2">
                    Shipping Address
                  </Text>
                  <Text className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {customer.shipping_address}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View className="mt-6 pt-4 border-t border-gray-200">
            <Text className="text-sm text-gray-600">
              Customer since:{" "}
              {new Date(customer.created_at).toLocaleDateString()}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
