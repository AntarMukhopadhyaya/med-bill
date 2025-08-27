import React from "react";
import { HeaderWithSearch } from "@/components/DesignSystem";
import { router } from "expo-router";

interface OrdersHeaderProps {
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

export const OrdersHeader: React.FC<OrdersHeaderProps> = ({
  title,
  searchValue,
  onSearchChange,
  placeholder = "Search orders by order number...",
  showAddButton = true,
  onAddPress,
  addButtonLabel = "Add Order",
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
      subtitle={subtitle || (customerId ? "Customer Orders" : undefined)}
      onBack={onBack || (customerId ? () => router.back() : undefined)}
      showFilterButton={showFilterButton}
      onFilterPress={onFilterPress}
      isFilterActive={isFilterActive}
    />
  );
};
