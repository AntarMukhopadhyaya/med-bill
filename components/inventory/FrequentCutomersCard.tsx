import React from "react";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/ui/card";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Customer } from "@/types/inventory";

interface FrequentCustomersCardProps {
  customers: { customer: Customer; orderCount: number; totalSpent: number }[];
}

export const FrequentCustomersCard: React.FC<FrequentCustomersCardProps> = ({
  customers,
}) => {
  if (customers.length === 0) {
    return (
      <Card className="p-6">
        <Text className="text-lg font-semibold text-typography-900 mb-4">
          Frequent Customers
        </Text>
        <VStack className="p-4 bg-background-100 rounded-lg items-center gap-2">
          <FontAwesome
            name="users"
            size={24}
            color="rgb(var(--color-typography-400))"
          />
          <Text className="text-sm text-typography-600 text-center">
            No customer data available
          </Text>
        </VStack>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Text className="text-lg font-semibold text-typography-900 mb-4">
        Frequent Customers
      </Text>

      <VStack className="gap-3">
        {customers
          .slice(0, 5)
          .map(({ customer, orderCount, totalSpent }, index) => (
            <TouchableOpacity
              key={customer.id}
              onPress={() => router.push(`/customers/${customer.id}` as any)}
              className="flex-row items-center p-3 bg-background-100 rounded-lg active:bg-background-200"
            >
              <Box className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                <FontAwesome
                  name="user"
                  size={16}
                  color="rgb(var(--color-primary-600))"
                />
              </Box>

              <VStack className="flex-1">
                <Text className="text-sm font-semibold text-typography-900">
                  {customer.name}
                </Text>
                {customer.company_name && (
                  <Text className="text-xs text-typography-600 mt-0.5">
                    {customer.company_name}
                  </Text>
                )}
              </VStack>

              <VStack className="items-end">
                <Text className="text-xs font-semibold text-typography-900">
                  {orderCount} orders
                </Text>
                <Text className="text-xs text-primary-600 mt-0.5">
                  ₹{totalSpent.toLocaleString()}
                </Text>
              </VStack>
            </TouchableOpacity>
          ))}
      </VStack>
    </Card>
  );
};
