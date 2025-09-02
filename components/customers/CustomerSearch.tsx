import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";

interface CustomerSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <VStack className="mb-4">
      <Input className="relative">
        <HStack className="absolute left-3 top-3 z-10 items-center">
          <FontAwesome
            name="search"
            size={16}
            color="rgb(var(--color-typography-400))"
          />
        </HStack>
        <InputField
          className="bg-background-50 border border-outline-300 rounded-lg pl-10 pr-4 py-3 text-typography-900"
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="rgb(var(--color-typography-400))"
        />
      </Input>
    </VStack>
  );
};
