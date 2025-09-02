import React from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatusOption } from "@/types/invoice";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

interface InvoiceFiltersProps {
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  statusOptions: StatusOption[];
}

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  statusFilter,
  setStatusFilter,
  statusOptions,
}) => {
  return (
    <VStack className="mb-4">
      <Text className="text-sm font-medium text-typography-700 mb-2">
        Filter by Status
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <HStack className="gap-3">
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setStatusFilter(option.key)}
              className={`px-4 py-2 rounded-lg border flex-row items-center ${
                statusFilter === option.key
                  ? "bg-primary-500 border-primary-500"
                  : "bg-background-0 border-outline-300"
              }`}
            >
              <FontAwesome
                name={option.icon}
                size={14}
                color={
                  statusFilter === option.key
                    ? "rgb(var(--color-background-0))"
                    : "rgb(var(--color-typography-600))"
                }
              />
              <Text
                className={`ml-2 font-medium ${
                  statusFilter === option.key
                    ? "text-background-0"
                    : "text-typography-700"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </HStack>
      </ScrollView>
    </VStack>
  );
};
