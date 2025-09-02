import { SalesData } from "@/types/reports";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback } from "react";
import { HStack, VStack, Card, Heading } from "@/components/DesignSystem";
import { Text } from "@/components/ui/text";

export const TopProductsList = React.memo(
  ({ data }: { data: SalesData["topProducts"] }) => {
    const renderItem = useCallback(
      ({ item }: { item: SalesData["topProducts"][0] }) => (
        <HStack
          className="justify-between items-center py-3 border-b border-gray-100"
          space="md"
        >
          <VStack className="flex-1" space="xs">
            <Text className="font-medium text-gray-900" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-sm text-gray-600" size="sm">
              {item.quantitySold} units sold
            </Text>
          </VStack>
          <Text className="font-semibold text-gray-900" size="md">
            ₹{item.revenue.toLocaleString()}
          </Text>
        </HStack>
      ),
      []
    );

    return (
      <Card variant="elevated" className="p-6">
        <VStack space="md">
          <Heading size="lg" className="text-gray-900">
            Top Products
          </Heading>
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
