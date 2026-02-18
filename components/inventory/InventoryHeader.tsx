import React, { useMemo } from "react";
import { StandardHeader } from "@/components/layout";

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
  const subtitleText = useMemo(
    () => `${itemCount} ${itemLabel}`,
    [itemCount, itemLabel]
  );

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
    />
  );
};
