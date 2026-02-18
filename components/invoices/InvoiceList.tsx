import React from "react";
import { InvoiceWithCustomer } from "@/types/invoice";
import { InvoiceCard } from "./InvoiceCard";
import { StandardList } from "@/components/layout";

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
  onDeleteInvoice: (invoiceId: string) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
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
  onDeleteInvoice,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
}) => {
  const renderInvoiceCard = ({
    item,
  }: {
    item: InvoiceWithCustomer;
    index: number;
  }) => (
    <InvoiceCard
      invoice={item}
      onViewInvoice={onViewInvoice}
      onViewCustomer={onViewCustomer}
      onDeleteInvoice={onDeleteInvoice}
    />
  );

  return (
    <StandardList
      data={invoices}
      renderItem={renderInvoiceCard}
      keyExtractor={(item) => item.id}
      isRefreshing={isRefetching}
      onRefresh={refetch}
      isLoading={isLoading}
      emptyStateTitle={
        searchQuery || statusFilter !== "all"
          ? "No invoices match your filters"
          : "No invoices found"
      }
      emptyStateDescription={
        searchQuery || statusFilter !== "all"
          ? "Try adjusting your search or filters."
          : "Create your first invoice to get started."
      }
      emptyStateIcon="file-text-o"
      onEmptyStateAction={onCreateInvoice}
      emptyStateActionLabel="Create Invoice"
      estimatedItemSize={200}
      contentPadding="md"
      itemSpacing="md"
      onEndReached={onLoadMore}
      hasMore={hasNextPage}
      isFetchingNextPage={!!isFetchingNextPage}
    />
  );
};
