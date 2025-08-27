import React from "react";
import { HeaderWithSearch } from "@/components/DesignSystem";

interface InventoryHeaderProps {
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

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  title,
  searchValue,
  onSearchChange,
  placeholder = "Search inventory by name, category...",
  showAddButton = true,
  onAddPress,
  addButtonLabel = "Add Item",
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
