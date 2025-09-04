import React from "react";
import { OrderWithRelations } from "@/types/orders";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";

interface OrderItemsListProps {
  order: OrderWithRelations;
}

export const OrderItemsList: React.FC<OrderItemsListProps> = ({ order }) => {
  return (
    <Box className="bg-background-0 border border-outline-200 rounded-xl p-5 shadow-sm">
      <HStack className="items-center justify-between mb-4">
        <VStack className="gap-0.5">
          <Text className="text-base font-semibold text-typography-900">
            Order Items
          </Text>
          <Text className="text-xs text-typography-500">
            {order.order_items.length} items
          </Text>
        </VStack>
      </HStack>
      <VStack className="gap-3">
        {order.order_items.map((item) => (
          <HStack
            key={item.id}
            className="justify-between items-start bg-background-50 border border-outline-100 rounded-lg px-4 py-3"
            space="md"
          >
            <VStack className="flex-1 gap-1 pr-3">
              <Text
                className="text-sm font-semibold text-typography-900"
                numberOfLines={1}
              >
                {item.inventory.name}
              </Text>
              {item.inventory.hsn ? (
                <Text className="text-[11px] text-typography-500">
                  {item.inventory.hsn}
                </Text>
              ) : null}
              <Text className="text-[11px] text-typography-500">
                Qty {item.quantity} × ₹{item.unit_price.toLocaleString()}
              </Text>
            </VStack>
            <VStack className="items-end min-w-[70px]">
              <Text className="text-sm font-semibold text-typography-900">
                ₹{item.total_price.toLocaleString()}
              </Text>
            </VStack>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
};
