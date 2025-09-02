import { FontAwesome } from "@expo/vector-icons";
import { ScrollView, TouchableOpacity } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import React from "react";

interface CustomerFiltersProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  sortBy: "name" | "created_at" | "last_order";
  setSortBy: (sort: "name" | "created_at" | "last_order") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showFilters,
  setShowFilters,
}) => {
  return (
    <VStack className="gap-4">
      <HStack className="justify-between items-center">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1 mr-4"
        >
          <HStack className="gap-3">
            <TouchableOpacity
              onPress={() => setFilterStatus("all")}
              className={`px-3 py-2 rounded-lg border ${
                filterStatus === "all"
                  ? "bg-primary-500 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filterStatus === "all"
                    ? "text-background-0"
                    : "text-typography-700"
                }`}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterStatus("with_orders")}
              className={`px-3 py-2 rounded-lg border ${
                filterStatus === "with_orders"
                  ? "bg-primary-500 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filterStatus === "with_orders"
                    ? "text-background-0"
                    : "text-typography-700"
                }`}
              >
                With Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterStatus("pending_payments")}
              className={`px-3 py-2 rounded-lg border ${
                filterStatus === "pending_payments"
                  ? "bg-primary-500 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filterStatus === "pending_payments"
                    ? "text-background-0"
                    : "text-typography-700"
                }`}
              >
                Pending Payments
              </Text>
            </TouchableOpacity>
          </HStack>
        </ScrollView>

        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="bg-background-100 p-2 rounded-lg"
        >
          <FontAwesome
            name="filter"
            size={16}
            color="rgb(var(--color-typography-600))"
          />
        </TouchableOpacity>
      </HStack>

      {/* Sort Options */}
      {showFilters && (
        <VStack className="p-4 bg-background-100 rounded-lg">
          <Text className="text-sm font-medium text-typography-700 mb-3">
            Sort by
          </Text>
          <HStack className="gap-3">
            <TouchableOpacity
              onPress={() => setSortBy("name")}
              className={`px-3 py-2 rounded-lg border ${
                sortBy === "name"
                  ? "bg-primary-500 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  sortBy === "name"
                    ? "text-background-0"
                    : "text-typography-700"
                }`}
              >
                Name
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy("created_at")}
              className={`px-3 py-2 rounded-lg border ${
                sortBy === "created_at"
                  ? "bg-primary-500 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  sortBy === "created_at"
                    ? "text-background-0"
                    : "text-typography-700"
                }`}
              >
                Date Added
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-background-0 border border-outline-300 px-3 py-2 rounded-lg"
            >
              <Text className="text-sm font-medium text-typography-700">
                {sortOrder === "asc" ? "↑" : "↓"}
              </Text>
            </TouchableOpacity>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
};
