import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface EmptyStateProps {
  searchQuery: string;
  filterStatus: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  searchQuery,
  filterStatus,
}) => {
  return (
    <View className="flex-1 justify-center items-center py-20 px-4">
      <FontAwesome name="users" size={48} color="#D1D5DB" />
      <Text className="text-gray-500 text-lg font-medium mt-4 mb-2">
        No customers found
      </Text>
      <Text className="text-gray-400 text-center mb-6">
        {searchQuery || filterStatus !== "all"
          ? "Try adjusting your search or filters"
          : "Start by adding your first customer"}
      </Text>
      {!searchQuery && filterStatus === "all" && (
        <TouchableOpacity
          onPress={() => router.push("/customers/create")}
          className="bg-blue-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">Add Customer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
