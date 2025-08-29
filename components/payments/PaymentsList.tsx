import React, { useMemo } from "react";
import { FlashList } from "@shopify/flash-list";
import { PaymentWithCustomer } from "@/types/payment";
import { PaymentCard } from "./PaymentCard";
import { EmptyPaymentsState } from "./EmptyPaymentsState";
import { spacing } from "@/components/DesignSystem";

interface PaymentsListProps {
  payments: PaymentWithCustomer[];
  isRefetching: boolean;
  refetch: () => void;
  onViewPayment: (payment: PaymentWithCustomer) => void;
  searchQuery: string;
  isLoading: boolean;
  onCreatePayment: () => void;
  onClearFilters: () => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({
  payments,
  isRefetching,
  refetch,
  onViewPayment,
  searchQuery,
  isLoading,
  onCreatePayment,
  onClearFilters,
}) => {
  const renderPaymentCard = ({ item }: { item: PaymentWithCustomer }) => (
    <PaymentCard payment={item} onViewDetails={onViewPayment} />
  );

  const estimatedItemSize = useMemo(() => 160, []);

  if (isLoading) {
    return null; // Loading handled by parent
  }

  if (payments.length === 0) {
    return (
      <EmptyPaymentsState
        searchQuery={searchQuery}
        onCreatePayment={onCreatePayment}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <FlashList
      data={payments}
      renderItem={renderPaymentCard}
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
