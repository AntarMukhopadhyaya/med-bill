import React from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/DesignSystem";

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
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <EmptyState
        icon="cube"
        title={hasFilters ? "No items found" : "No inventory items"}
        description={
          hasFilters
            ? "Try adjusting your search or filters"
            : "Add your first inventory item to get started"
        }
        actionLabel={hasFilters ? "Clear Filters" : "Add Item"}
        onAction={hasFilters ? onClearFilters : onCreateItem}
      />
    </View>
  );
};
