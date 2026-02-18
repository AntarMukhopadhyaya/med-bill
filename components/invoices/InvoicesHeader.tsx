import React, { useMemo } from "react";
import { router } from "expo-router";
import { StandardHeader } from "@/components/layout";

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
  const subtitleText = useMemo(() => {
    if (subtitle) return subtitle;
    if (customerId) return "Customer Invoices";
    return `${itemCount} ${itemLabel}`;
  }, [subtitle, customerId, itemCount, itemLabel]);

  return (
    <StandardHeader
      title={title}
      subtitle={subtitleText}
      searchQuery={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={placeholder}
      showAddButton={showAddButton}
      onAddPress={onAddPress}
      showFiltersButton={showFilterButton}
      onFiltersPress={onFilterPress}
      showBackButton={!!(onBack || customerId)}
      onBack={onBack || (customerId ? () => router.back() : undefined)}
    />
  );
};
