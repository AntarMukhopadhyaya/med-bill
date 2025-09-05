import React from "react";
import { OrderWithCustomer } from "@/types/orders";
import { OrderCard } from "./OrderCard";
import { StandardList } from "@/components/layout";

interface OrderListProps {
  orders: OrderWithCustomer[];
  isRefetching: boolean;
  refetch: () => void;
  onViewOrder: (orderId: string) => void;
  onViewCustomer: (customerId: string) => void;
  searchQuery: string;
  statusFilter: string;
  isLoading: boolean;
  onCreateOrder: () => void;
  onClearFilters: () => void;
  onDeleteOrder: (orderId: string) => void;
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
  onCreateOrder,
  onClearFilters,
  onDeleteOrder,
}) => {
  const renderOrderCard = ({
    item,
  }: {
    item: OrderWithCustomer;
    index: number;
  }) => (
    <OrderCard
      onDeleteOrder={onDeleteOrder}
      order={item}
      onViewOrder={onViewOrder}
      onViewCustomer={onViewCustomer}
    />
  );

  return (
    <StandardList
      data={orders}
      renderItem={renderOrderCard}
      keyExtractor={(item) => item.id}
      isRefreshing={isRefetching}
      onRefresh={refetch}
      isLoading={isLoading}
      emptyStateTitle="No orders found"
      emptyStateDescription="Start by creating your first order to track customer purchases."
      emptyStateIcon="file-text"
      onEmptyStateAction={onCreateOrder}
      emptyStateActionLabel="Create Order"
      estimatedItemSize={180}
      contentPadding="md"
      itemSpacing="md"
    />
  );
};
