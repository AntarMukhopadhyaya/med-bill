import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatusOption } from "@/types/orders";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { ScrollView } from "react-native";
import { Pressable } from "react-native";

interface OrderFiltersProps {
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  statusOptions: StatusOption[];
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  statusFilter,
  setStatusFilter,
  statusOptions,
}) => {
  return (
    <HStack className="mb-4 items-center" space="sm">
      <Text className="text-sm font-medium text-typography-600 mr-2">
        Filter by Status
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <HStack className="gap-2">
          {statusOptions.map((option) => {
            const active = statusFilter === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setStatusFilter(option.key)}
                className={`px-3 py-2 rounded-lg border flex-row items-center ${
                  active
                    ? "bg-primary-500 border-primary-500"
                    : "bg-background-0 border-outline-300"
                }`}
              >
                <FontAwesome
                  name={option.icon}
                  size={14}
                  color={active ? "white" : "rgb(var(--color-typography-500))"}
                />
                <Text
                  className={`ml-1 text-xs font-medium ${
                    active ? "text-white" : "text-typography-700"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      </ScrollView>
    </HStack>
  );
};
