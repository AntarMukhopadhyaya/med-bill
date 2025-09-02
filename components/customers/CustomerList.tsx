import React from "react";
import { CustomerCard } from "./CustomerCard";
import { Database } from "@/types/database.types";
import { StandardList } from "@/components/layout";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface CustomerListProps {
  customers: Customer[];
  isRefetching: boolean;
  refetch: () => void;
  onDeleteCustomer: (customer: Customer) => void;
  searchQuery: string;
  filterStatus: string;
  isLoading: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  isRefetching,
  refetch,
  onDeleteCustomer,
  searchQuery,
  filterStatus,
  isLoading,
}) => {
  const renderCustomerCard = ({ item }: { item: Customer; index: number }) => (
    <CustomerCard customer={item} onDelete={onDeleteCustomer} />
  );

  return (
    <StandardList
      data={customers}
      renderItem={renderCustomerCard}
      keyExtractor={(item) => item.id}
      isRefreshing={isRefetching}
      onRefresh={refetch}
      isLoading={isLoading}
      emptyStateTitle="No customers found"
      emptyStateDescription="Start by adding your first customer to begin managing your business relationships."
      emptyStateIcon="users"
      estimatedItemSize={200}
      contentPadding="md"
      itemSpacing="md"
    />
  );
};
