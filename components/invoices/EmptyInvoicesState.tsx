import React from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/DesignSystem";

interface EmptyInvoicesStateProps {
  searchQuery: string;
  statusFilter: string;
  onCreateInvoice: () => void;
  onClearFilters: () => void;
}

export const EmptyInvoicesState: React.FC<EmptyInvoicesStateProps> = ({
  searchQuery,
  statusFilter,
  onCreateInvoice,
  onClearFilters,
}) => {
  const hasFilters = searchQuery || statusFilter !== "all";

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <EmptyState
        icon="file-text"
        title={hasFilters ? "No invoices found" : "No invoices yet"}
        description={
          hasFilters
            ? "Try adjusting your search or filters"
            : "Create your first invoice to get started"
        }
        actionLabel={hasFilters ? "Clear Filters" : "Add Invoice"}
        onAction={hasFilters ? onClearFilters : onCreateInvoice}
      />
    </View>
  );
};
