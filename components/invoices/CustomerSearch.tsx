import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/DesignSystem";
import { Customer } from "@/types/invoice";
import { colors, spacing } from "@/components/DesignSystem";

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
    <View style={{ marginBottom: spacing[4] }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.gray[700],
          marginBottom: spacing[2],
        }}
      >
        Customer *
      </Text>

      <SearchBar
        value={customerSearch}
        onChange={onCustomerSearch}
        placeholder="Search customers..."
      />

      {customers.length > 0 && (
        <ScrollView
          style={{
            maxHeight: 160,
            marginTop: spacing[2],
            borderWidth: 1,
            borderColor: colors.gray[200],
            borderRadius: 8,
            backgroundColor: colors.white,
          }}
        >
          {customers.map((customer) => (
            <Button
              key={customer.id}
              title={`${customer.name}${customer.company_name ? ` (${customer.company_name})` : ""}`}
              variant={selectedCustomerId === customer.id ? "primary" : "ghost"}
              onPress={() => onSelectCustomer(customer.id, customer.name)}
              style={{ marginBottom: spacing[1] }}
            />
          ))}
        </ScrollView>
      )}

      {error && (
        <Text
          style={{
            color: colors.error[500],
            fontSize: 12,
            marginTop: spacing[1],
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};
