import React from "react";
import { LedgerCard } from "./LedgerCard";
import { StandardList } from "@/components/layout";
import { Database } from "@/types/database.types";

type Ledger = Database["public"]["Tables"]["ledgers"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface LedgerWithDetails extends Ledger {
  customer?: Customer | null;
}

interface LedgerListProps {
  ledgers: LedgerWithDetails[];
  isRefetching: boolean;
  refetch: () => void;
  searchQuery: string;
  isLoading: boolean;
}

export const LedgerList: React.FC<LedgerListProps> = ({
  ledgers,
  isRefetching,
  refetch,
  searchQuery,
  isLoading,
}) => {
  const renderLedgerCard = ({
    item,
  }: {
    item: LedgerWithDetails;
    index: number;
  }) => <LedgerCard ledger={item} />;

  return (
    <StandardList
      data={ledgers}
      renderItem={renderLedgerCard}
      keyExtractor={(item) => item.id}
      isRefreshing={isRefetching}
      onRefresh={refetch}
      isLoading={isLoading}
      emptyStateTitle="No ledgers found"
      emptyStateDescription={
        searchQuery
          ? "Try adjusting your search terms"
          : "Customer ledgers will appear here as they are created"
      }
      emptyStateIcon="book"
      estimatedItemSize={200}
      contentPadding="md"
      itemSpacing="md"
    />
  );
};
