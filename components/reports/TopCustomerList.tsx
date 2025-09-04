import { SalesData } from "@/types/reports";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Pressable } from "../ui/pressable";
import { router } from "expo-router";

export const TopCustomersList = React.memo(
  ({ data }: { data: SalesData["topCustomers"] }) => {
    const renderItem = useCallback(
      ({ item }: { item: SalesData["topCustomers"][0] }) => (
        <HStack className="justify-between items-center py-3 border-b border-outline-200 mb-3">
          <VStack className="flex-1 gap-1">
            <Text className="font-medium text-typography-900" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-sm text-typography-600">
              {item.orderCount} orders
            </Text>
          </VStack>
          <Text className="font-semibold text-typography-900">
            ₹{item.totalSpent.toLocaleString()}
          </Text>
        </HStack>
      ),
      []
    );

    return (
      <Card className="p-6 mb-3">
        <VStack className="gap-4">
          <Text className="text-lg font-semibold text-typography-900">
            Top Customers
          </Text>
          <FlashList
            data={data}
            renderItem={renderItem}
            estimatedItemSize={70}
            keyExtractor={(item, index) => `${item.name}-${index}`}
          />
        </VStack>
      </Card>
    );
  }
);
