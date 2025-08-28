import { InventoryTurnoverItem } from "@/types/reports";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback } from "react";
import { Text, View } from "react-native";

export const InventoryTurnoverList = React.memo(
  ({ data }: { data: InventoryTurnoverItem[] }) => {
    const renderItem = useCallback(
      ({ item }: { item: InventoryTurnoverItem }) => (
        <View className="flex-row justify-between items-center py-3 border-b border-gray-100 mb-4">
          <View className="flex-1">
            <Text className="font-medium text-gray-900" numberOfLines={1}>
              {item.item_name}
            </Text>
            <Text className="text-sm text-gray-600">
              Sold: {item.total_sold} | Stock: {item.closing_stock}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-semibold text-green-600">
              {item.turnover_ratio.toFixed(2)}x
            </Text>
            <Text className="text-xs text-gray-500">
              {item.days_of_stock === 999
                ? "∞ days"
                : `${Math.round(item.days_of_stock)} days`}
            </Text>
          </View>
        </View>
      ),
      []
    );

    return (
      <FlashList
        data={data
          .sort((a, b) => b.turnover_ratio - a.turnover_ratio)
          .slice(0, 10)}
        renderItem={renderItem}
        estimatedItemSize={70}
        keyExtractor={(item) => item.item_id}
      />
    );
  }
);
