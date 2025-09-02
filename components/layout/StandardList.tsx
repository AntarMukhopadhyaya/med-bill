import React from "react";
import { FlashList } from "@shopify/flash-list";
import { RefreshControl, View } from "react-native";
import { EmptyState } from "@/components/DesignSystem";

interface StandardListProps<T> {
  data: T[];
  renderItem: ({
    item,
    index,
  }: {
    item: T;
    index: number;
  }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateIcon?: any;
  onEmptyStateAction?: () => void;
  emptyStateActionLabel?: string;
  estimatedItemSize?: number;
  contentPadding?: "none" | "sm" | "md" | "lg";
  itemSpacing?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "px-0",
  sm: "px-2",
  md: "px-4",
  lg: "px-6",
};

const spacingMap = {
  none: "mb-0",
  sm: "mb-2",
  md: "mb-4",
  lg: "mb-6",
};

export function StandardList<T>({
  data,
  renderItem,
  keyExtractor,
  isRefreshing = false,
  onRefresh,
  isLoading = false,
  emptyStateTitle = "No items found",
  emptyStateDescription = "There are no items to display",
  emptyStateIcon = "list",
  onEmptyStateAction,
  emptyStateActionLabel,
  estimatedItemSize = 180,
  contentPadding = "md",
  itemSpacing = "md",
}: StandardListProps<T>) {
  const wrappedRenderItem = ({ item, index }: { item: T; index: number }) => (
    <View
      className={`${paddingMap[contentPadding]} ${spacingMap[itemSpacing]}`}
    >
      {renderItem({ item, index })}
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <EmptyState
          icon="spinner"
          title="Loading..."
          description="Please wait while we fetch the data"
        />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <EmptyState
          icon={emptyStateIcon}
          title={emptyStateTitle}
          description={emptyStateDescription}
          actionLabel={emptyStateActionLabel}
          onAction={onEmptyStateAction}
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList
        data={data}
        renderItem={wrappedRenderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={estimatedItemSize}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      />
    </View>
  );
}
