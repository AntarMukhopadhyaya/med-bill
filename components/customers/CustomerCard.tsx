import React, { memo } from "react";
import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking } from "react-native";
import { BaseCard, BaseCardAction } from "@/components/shared/BaseCard";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface CustomerCardProps {
  customer: Customer;
  onDelete: (customer: Customer) => void;
}

const CustomerCardComponent: React.FC<CustomerCardProps> = ({
  customer,
  onDelete,
}) => {
  // Additional customer-specific actions
  const additionalActions: BaseCardAction[] = [
    {
      icon: "phone",
      colorClass: "text-success-600",
      backgroundClass: "bg-success-50",
      onPress: () => Linking.openURL(`tel:${customer.phone}`),
      label: "Call",
    },
    ...(customer.email
      ? [
          {
            icon: "envelope",
            colorClass: "text-info-600",
            backgroundClass: "bg-info-50",
            onPress: () => Linking.openURL(`mailto:${customer.email}`),
            label: "Email",
          },
        ]
      : []),
  ];

  // Contact Info Section
  const infoSection = (
    <>
      <HStack className="items-center gap-2">
        <FontAwesome
          name="phone"
          size={12}
          color="rgb(var(--color-primary-500))"
        />
        <Text className="text-sm text-typography-900 flex-1" numberOfLines={1}>
          {customer.phone}
        </Text>
      </HStack>

      {customer.email && (
        <HStack className="items-center gap-2">
          <FontAwesome
            name="envelope"
            size={12}
            color="rgb(var(--color-primary-500))"
          />
          <Text
            className="text-sm text-typography-900 flex-1"
            numberOfLines={1}
          >
            {customer.email}
          </Text>
        </HStack>
      )}

      {customer.gstin && (
        <HStack className="items-center gap-2">
          <FontAwesome
            name="id-card"
            size={12}
            color="rgb(var(--color-primary-500))"
          />
          <Text
            className="text-sm text-typography-900 flex-1"
            numberOfLines={1}
          >
            GSTIN: {customer.gstin}
          </Text>
        </HStack>
      )}
    </>
  );

  return (
    <BaseCard
      title={customer.name}
      subtitle={customer.company_name || undefined}
      onPress={() => router.push(`/customers/${customer.id}` as any)}
      onEdit={() => router.push(`/customers/${customer.id}/edit` as any)}
      onDelete={() => onDelete(customer)}
      onViewDetails={() => router.push(`/customers/${customer.id}` as any)}
      additionalActions={additionalActions}
      infoSection={infoSection}
    />
  );
};

export const CustomerCard = memo(CustomerCardComponent);
