import React, { useMemo } from "react";
import { FlashList } from "@shopify/flash-list";
import { OrderWithCustomer } from "@/types/orders";
import { OrderCard } from "./OrderCard";
import { EmptyOrdersState } from "./EmptyOrdersState";
import { spacing } from "@/components/DesignSystem";
import { View } from "react-native";

interface OrderListProps {
  orders: OrderWithCustomer[];
  isRefetching: boolean;
  refetch: () => void;
  onViewOrder: (orderId: string) => void;
  onViewCustomer: (customerId: string) => void;
  searchQuery: string;
  statusFilter: string;
  isLoading: boolean;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  isRefetching,
  refetch,
  onViewOrder,
  onViewCustomer,
  searchQuery,
  statusFilter,
  isLoading,
}) => {
  const renderOrderCard = ({ item }: { item: OrderWithCustomer }) => (
    <View className="mb-4">
      <OrderCard
        order={item}
        onViewOrder={onViewOrder}
        onViewCustomer={onViewCustomer}
      />
    </View>
  );

  const estimatedItemSize = useMemo(() => 160, []);

  if (isLoading) {
    return null; // Loading handled by parent
  }

  if (orders.length === 0) {
    return (
      <EmptyOrdersState
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onCreateOrder={() => {}}
        onClearFilters={() => {}}
      />
    );
  }

  return (
    <FlashList
      data={orders}
      renderItem={renderOrderCard}
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
