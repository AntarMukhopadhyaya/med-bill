import React from "react";
import { HeaderWithSearch } from "@/components/DesignSystem";
import { router } from "expo-router";

interface InvoicesHeaderProps {
  title: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
  showAddButton?: boolean;
  onAddPress?: () => void;
  addButtonLabel?: string;
  itemCount: number;
  itemLabel: string;
  subtitle?: string;
  onBack?: () => void;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  isFilterActive?: boolean;
  customerId?: string;
}

export const InvoicesHeader: React.FC<InvoicesHeaderProps> = ({
  title,
  searchValue,
  onSearchChange,
  placeholder = "Search by invoice number, customer name...",
  showAddButton = true,
  onAddPress,
  addButtonLabel = "Add Invoice",
  itemCount,
  itemLabel,
  subtitle,
  onBack,
  showFilterButton = true,
  onFilterPress,
  isFilterActive = false,
  customerId,
}) => {
  return (
    <HeaderWithSearch
      title={title}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      placeholder={placeholder}
      showAddButton={showAddButton}
      onAddPress={onAddPress}
      addButtonLabel={addButtonLabel}
      itemCount={itemCount}
      itemLabel={itemLabel}
      subtitle={subtitle || (customerId ? "Customer Invoices" : undefined)}
      onBack={onBack || (customerId ? () => router.back() : undefined)}
      showFilterButton={showFilterButton}
      onFilterPress={onFilterPress}
      isFilterActive={isFilterActive}
    />
  );
};
