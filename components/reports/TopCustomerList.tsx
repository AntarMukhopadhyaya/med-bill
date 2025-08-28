import { SalesData } from "@/types/reports";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback } from "react";
import { Text, View } from "react-native";

export const TopCustomersList = React.memo(
  ({ data }: { data: SalesData["topCustomers"] }) => {
    const renderItem = useCallback(
      ({ item }: { item: SalesData["topCustomers"][0] }) => (
        <View className="flex-row justify-between items-center py-3 border-b border-gray-100 ">
          <View className="flex-1">
            <Text className="font-medium text-gray-900" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-sm text-gray-600">
              {item.orderCount} orders
            </Text>
          </View>
          <Text className="font-semibold text-gray-900">
            ₹{item.totalSpent.toLocaleString()}
          </Text>
        </View>
      ),
      []
    );

    return (
      <FlashList
        data={data}
        renderItem={renderItem}
        estimatedItemSize={70}
        keyExtractor={(item, index) => `${item.name}-${index}`}
      />
    );
  }
);
