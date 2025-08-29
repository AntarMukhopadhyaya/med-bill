import React from "react";
import { HeaderWithSearch } from "@/components/DesignSystem";

interface PaymentsHeaderProps {
  title: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
  showAddButton?: boolean;
  onAddPress?: () => void;
  addButtonLabel?: string;
  itemCount: number;
  itemLabel: string;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  isFilterActive?: boolean;
}

export const PaymentsHeader: React.FC<PaymentsHeaderProps> = ({
  title,
  searchValue,
  onSearchChange,
  placeholder = "Search payments...",
  showAddButton = true,
  onAddPress,
  addButtonLabel = "Add Payment",
  itemCount,
  itemLabel,
  showFilterButton = true,
  onFilterPress,
  isFilterActive = false,
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
      showFilterButton={showFilterButton}
      onFilterPress={onFilterPress}
      isFilterActive={isFilterActive}
    />
  );
};
