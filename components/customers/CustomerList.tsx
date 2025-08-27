import React from "react";
import { View, RefreshControl, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";

import CustomerCard from "./CustomerCard";
import { Database } from "@/types/database.types";
import { EmptyState } from "../EmptyState";
type Customer = Database["public"]["Tables"]["customers"]["Row"];
interface CustomerListProps {
  customers: Customer[];
  isRefetching: boolean;
  refetch: () => void;
  onDeleteCustomer: (customer: Customer) => void;
  searchQuery: string;
  filterStatus: string;
  isLoading: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  isRefetching,
  refetch,
  onDeleteCustomer,
  searchQuery,
  filterStatus,
  isLoading,
}) => {
  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <CustomerCard customer={item} onDelete={onDeleteCustomer} />
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList
        data={customers}
        renderItem={renderCustomerCard}
        keyExtractor={(item) => item.id}
        estimatedItemSize={180}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState searchQuery={searchQuery} filterStatus={filterStatus} />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        drawDistance={500}
        overrideProps={{
          initialNumToRender: 10,
          maxToRenderPerBatch: 10,
          windowSize: 21,
        }}
      />
    </View>
  );
};
