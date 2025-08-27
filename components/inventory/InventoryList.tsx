import React, { useMemo } from "react";
import { FlashList } from "@shopify/flash-list";
import { InventoryItem } from "@/types/inventory";
import { InventoryCard } from "./InventoryCard";
import { EmptyInventoryState } from "./EmptyInventoryState";
import { spacing } from "@/components/DesignSystem";
import { View } from "react-native";

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
  const renderInventoryCard = ({ item }: { item: InventoryItem }) => (
    <View className="mb-4">
      <InventoryCard
        item={item}
        onPress={onItemPress}
        onEdit={onEditItem}
        onDelete={onDeleteItem}
        isSelectionMode={isSelectionMode}
        isSelected={selectedItems.has(item.id)}
      />
    </View>
  );

  const estimatedItemSize = useMemo(() => 160, []);

  if (isLoading) {
    return null; // Loading handled by parent
  }

  if (items.length === 0) {
    return (
      <EmptyInventoryState
        searchQuery={searchQuery}
        filterCategory={filterCategory}
        onCreateItem={onCreateItem}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <FlashList
      data={items}
      renderItem={renderInventoryCard}
      keyExtractor={(item) => item.id}
      estimatedItemSize={estimatedItemSize}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={{
        padding: spacing[6],
        paddingTop: spacing[4],
      }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      drawDistance={500}
    />
  );
};
