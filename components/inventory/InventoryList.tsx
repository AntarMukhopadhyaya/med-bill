import React from "react";
import { InventoryItem } from "@/types/inventory";
import { InventoryCard } from "./InventoryCard";
import { StandardList } from "@/components/layout";

interface InventoryListProps {
  items: InventoryItem[];
  isRefetching: boolean;
  refetch: () => void;
  onItemPress: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  searchQuery: string;
  filterCategory: string;
  isLoading: boolean;
  onCreateItem: () => void;
  onClearFilters: () => void;
  isSelectionMode?: boolean;
  selectedItems?: Set<string>;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  items,
  isRefetching,
  refetch,
  onItemPress,
  onEditItem,
  onDeleteItem,
  searchQuery,
  filterCategory,
  isLoading,
  onCreateItem,
  onClearFilters,
  isSelectionMode = false,
  selectedItems = new Set(),
}) => {
  const renderInventoryCard = ({
    item,
  }: {
    item: InventoryItem;
    index: number;
  }) => (
    <InventoryCard
      item={item}
      onPress={onItemPress}
      onEdit={onEditItem}
      onDelete={onDeleteItem}
      isSelectionMode={isSelectionMode}
      isSelected={selectedItems.has(item.id)}
    />
  );

  return (
    <StandardList
      data={items}
      renderItem={renderInventoryCard}
      keyExtractor={(item) => item.id}
      isRefreshing={isRefetching}
      onRefresh={refetch}
      isLoading={isLoading}
      emptyStateTitle="No inventory items found"
      emptyStateDescription="Start by adding your first inventory item to track your stock."
      emptyStateIcon="archive"
      onEmptyStateAction={onCreateItem}
      emptyStateActionLabel="Add Item"
      estimatedItemSize={220}
      contentPadding="md"
      itemSpacing="md"
    />
  );
};
