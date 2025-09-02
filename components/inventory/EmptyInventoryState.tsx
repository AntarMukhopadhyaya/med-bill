import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

interface EmptyInventoryStateProps {
  searchQuery: string;
  filterCategory: string;
  onCreateItem: () => void;
  onClearFilters: () => void;
}

export const EmptyInventoryState: React.FC<EmptyInventoryStateProps> = ({
  searchQuery,
  filterCategory,
  onCreateItem,
  onClearFilters,
}) => {
  const hasFilters = searchQuery || filterCategory !== "all";

  return (
    <VStack className="flex-1 justify-center items-center p-8">
      <VStack className="items-center gap-6 max-w-sm">
        {/* Icon */}
        <VStack className="w-16 h-16 bg-background-100 rounded-full items-center justify-center">
          <FontAwesome
            name="cube"
            size={32}
            color="rgb(var(--color-typography-400))"
          />
        </VStack>

        {/* Content */}
        <VStack className="items-center gap-2">
          <Text className="text-xl font-semibold text-typography-900 text-center">
            {hasFilters ? "No items found" : "No inventory items"}
          </Text>
          <Text className="text-sm text-typography-600 text-center leading-relaxed">
            {hasFilters
              ? "Try adjusting your search or filters"
              : "Add your first inventory item to get started"}
          </Text>
        </VStack>

        {/* Action Button */}
        <Button
          onPress={hasFilters ? onClearFilters : onCreateItem}
          className="px-6 py-3"
        >
          <Text className="text-background-0 font-medium">
            {hasFilters ? "Clear Filters" : "Add Item"}
          </Text>
        </Button>
      </VStack>
    </VStack>
  );
};
