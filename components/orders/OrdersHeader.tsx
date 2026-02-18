import React, { useMemo } from "react";
import { router } from "expo-router";
import { StandardHeader } from "@/components/layout";

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
  const subtitleText = useMemo(() => {
    if (subtitle) return subtitle;
    if (customerId) return "Customer Orders";
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
