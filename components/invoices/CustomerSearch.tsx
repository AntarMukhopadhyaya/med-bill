import React from "react";
import { ScrollView } from "react-native";
import { SearchBar } from "@/components/SearchBar";
import { Customer } from "@/types/invoice";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

interface CustomerSearchProps {
  customers: Customer[];
  customerSearch: string;
  onCustomerSearch: (search: string) => void;
  onSelectCustomer: (customerId: string, customerName: string) => void;
  selectedCustomerId: string;
  error?: string;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  customers,
  customerSearch,
  onCustomerSearch,
  onSelectCustomer,
  selectedCustomerId,
  error,
}) => {
  return (
    <VStack className="mb-4">
      <Text className="text-sm font-semibold text-typography-700 mb-2">
        Customer *
      </Text>

      <SearchBar
        value={customerSearch}
        onChange={onCustomerSearch}
        placeholder="Search customers..."
      />

      {customers.length > 0 && (
        <ScrollView className="max-h-40 mt-2 border border-outline-200 rounded-lg bg-background-0">
          <VStack className="p-1">
            {customers.map((customer) => (
              <Button
                key={customer.id}
                variant={
                  selectedCustomerId === customer.id ? "solid" : "outline"
                }
                onPress={() => onSelectCustomer(customer.id, customer.name)}
                className="mb-1"
              >
                <Text
                  className={
                    selectedCustomerId === customer.id
                      ? "text-background-0"
                      : "text-typography-700"
                  }
                >
                  {customer.name}
                  {customer.company_name ? ` (${customer.company_name})` : ""}
                </Text>
              </Button>
            ))}
          </VStack>
        </ScrollView>
      )}

      {error && <Text className="text-error-500 text-xs mt-1">{error}</Text>}
    </VStack>
  );
};
