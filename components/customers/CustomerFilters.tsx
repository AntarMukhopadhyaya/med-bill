import { FontAwesome } from "@expo/vector-icons";
import { ScrollView, View } from "react-native";
import { Text, TouchableOpacity } from "react-native";

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
    <>
      <View className="flex-row justify-between items-center">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1 mr-4 gap-2"
        >
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => setFilterStatus("all")}
              className={`px-3 py-2 rounded-full ${
                filterStatus === "all" ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filterStatus === "all" ? "text-white" : "text-gray-700"
                }`}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterStatus("with_orders")}
              className={`px-3 py-2 rounded-full ${
                filterStatus === "with_orders" ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filterStatus === "with_orders"
                    ? "text-white"
                    : "text-gray-700"
                }`}
              >
                With Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterStatus("pending_payments")}
              className={`px-3 py-2 rounded-full ${
                filterStatus === "pending_payments"
                  ? "bg-blue-600"
                  : "bg-gray-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filterStatus === "pending_payments"
                    ? "text-white"
                    : "text-gray-700"
                }`}
              >
                Pending Payments
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="bg-gray-200 p-2 rounded-lg"
        >
          <FontAwesome name="filter" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      {showFilters && (
        <View className="mt-4 p-4 bg-gray-50 rounded-lg">
          <Text className="text-sm font-medium text-gray-700 mb-3">
            Sort by
          </Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => setSortBy("name")}
              className={`px-3 py-2 rounded-full ${
                sortBy === "name" ? "bg-blue-600" : "bg-white"
              }`}
            >
              <Text
                className={`text-sm ${
                  sortBy === "name" ? "text-white" : "text-gray-700"
                }`}
              >
                Name
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortBy("created_at")}
              className={`px-3 py-2 rounded-full ${
                sortBy === "created_at" ? "bg-blue-600" : "bg-white"
              }`}
            >
              <Text
                className={`text-sm ${
                  sortBy === "created_at" ? "text-white" : "text-gray-700"
                }`}
              >
                Date Added
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-white px-3 py-2 rounded-full"
            >
              <Text className="text-sm text-gray-700">
                {sortOrder === "asc" ? "↑" : "↓"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
};
