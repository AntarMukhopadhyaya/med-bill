import React from "react";
import { router } from "expo-router";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
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
    <VStack
      className="flex-1 justify-center items-center py-20 px-4"
      space="lg"
    >
      <FontAwesome name="users" size={48} color="#9CA3AF" />
      <VStack space="sm" className="items-center">
        <Text className="text-typography-500 text-lg font-medium">
          No customers found
        </Text>
        <Text className="text-typography-400 text-center">
          {searchQuery || filterStatus !== "all"
            ? "Try adjusting your search or filters"
            : "Start by adding your first customer"}
        </Text>
      </VStack>
      {!searchQuery && filterStatus === "all" && (
        <Button
          onPress={() => router.push("/customers/create")}
          className="bg-primary-600"
        >
          <ButtonText className="text-white font-medium">
            Add Customer
          </ButtonText>
        </Button>
      )}
    </VStack>
  );
};
