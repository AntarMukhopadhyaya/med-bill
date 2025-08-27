import React, { useMemo } from "react";
import { FlashList } from "@shopify/flash-list";
import { InvoiceWithCustomer } from "@/types/invoice";
import { InvoiceCard } from "./InvoiceCard";
import { EmptyInvoicesState } from "./EmptyInvoicesState";
import { spacing } from "@/components/DesignSystem";

interface InvoiceListProps {
  invoices: InvoiceWithCustomer[];
  isRefetching: boolean;
  refetch: () => void;
  onViewInvoice: (invoiceId: string) => void;
  onViewCustomer: (customerId: string) => void;
  searchQuery: string;
  statusFilter: string;
  isLoading: boolean;
  onCreateInvoice: () => void;
  onClearFilters: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  isRefetching,
  refetch,
  onViewInvoice,
  onViewCustomer,
  searchQuery,
  statusFilter,
  isLoading,
  onCreateInvoice,
  onClearFilters,
}) => {
  const renderInvoiceCard = ({ item }: { item: InvoiceWithCustomer }) => (
    <InvoiceCard
      invoice={item}
      onViewInvoice={onViewInvoice}
      onViewCustomer={onViewCustomer}
    />
  );

  const estimatedItemSize = useMemo(() => 180, []);

  if (isLoading) {
    return null; // Loading handled by parent
  }

  if (invoices.length === 0) {
    return (
      <EmptyInvoicesState
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onCreateInvoice={onCreateInvoice}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <FlashList
      data={invoices}
      renderItem={renderInvoiceCard}
      keyExtractor={(item) => item.id}
      estimatedItemSize={estimatedItemSize}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={{
        padding: spacing[6],
        paddingTop: spacing[4],
      }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      drawDistance={500}
    />
  );
};
