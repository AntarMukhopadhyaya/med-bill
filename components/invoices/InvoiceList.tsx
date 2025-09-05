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
      emptyStateTitle="No invoices found"
      emptyStateDescription="Start by creating your first invoice to bill customers."
      emptyStateIcon="file-text"
      onEmptyStateAction={onCreateInvoice}
      emptyStateActionLabel="Create Invoice"
      estimatedItemSize={200}
      contentPadding="md"
      itemSpacing="md"
    />
  );
};
