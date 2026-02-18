import React from "react";
import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import FontAwesome from "@expo/vector-icons/FontAwesome";

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
  onEndReached?: () => void;
  hasMore?: boolean;
  isFetchingNextPage?: boolean;
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
  onEndReached,
  hasMore = false,
  isFetchingNextPage = false,
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
      <View className="flex-1 justify-center items-center py-8 px-4">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-sm font-medium text-typography-600">
          Loading...
        </Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 justify-center items-center py-12 px-6">
        <VStack space="md" className="items-center">
          {emptyStateIcon && (
            <FontAwesome name={emptyStateIcon} size={40} color="#9CA3AF" />
          )}
          <VStack space="xs" className="items-center">
            <Text className="text-base font-semibold text-typography-800">
              {emptyStateTitle}
            </Text>
            <Text className="text-sm text-typography-500 text-center">
              {emptyStateDescription}
            </Text>
          </VStack>
          {onEmptyStateAction && emptyStateActionLabel && (
            <Button
              onPress={onEmptyStateAction}
              className="mt-2 bg-primary-600 px-4"
            >
              <ButtonText className="text-white font-medium">
                {emptyStateActionLabel}
              </ButtonText>
            </Button>
          )}
        </VStack>
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
        onEndReached={
          onEndReached && hasMore
            ? () => {
                onEndReached();
              }
            : undefined
        }
        onEndReachedThreshold={hasMore && onEndReached ? 0.5 : undefined}
        ListFooterComponent={
          hasMore && isFetchingNextPage ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}
