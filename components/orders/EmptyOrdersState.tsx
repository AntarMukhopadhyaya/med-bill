import React from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/DesignSystem";

interface EmptyOrdersStateProps {
  searchQuery: string;
  statusFilter: string;
  onCreateOrder: () => void;
  onClearFilters: () => void;
}

export const EmptyOrdersState: React.FC<EmptyOrdersStateProps> = ({
  searchQuery,
  statusFilter,
  onCreateOrder,
  onClearFilters,
}) => {
  const hasFilters = searchQuery || statusFilter !== "all";

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <EmptyState
        icon="shopping-cart"
        title={hasFilters ? "No orders found" : "No orders yet"}
        description={
          hasFilters
            ? "Try adjusting your search or filters"
            : "Create your first order to get started"
        }
        actionLabel={hasFilters ? "Clear Filters" : "Add Order"}
        onAction={hasFilters ? onClearFilters : onCreateOrder}
      />
    </View>
  );
};
