import React from "react";
import { View, TextInput } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface CustomerSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <View className="relative mb-4">
      <FontAwesome
        name="search"
        size={16}
        color="#9CA3AF"
        style={{ position: "absolute", left: 12, top: 12, zIndex: 1 }}
      />
      <TextInput
        className="bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-3"
        placeholder="Search customers by name, email, or phone..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  );
};
