import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/DesignSystem";
import { Customer } from "@/types/inventory";
import { colors, spacing } from "@/components/DesignSystem";

interface FrequentCustomersCardProps {
  customers: { customer: Customer; orderCount: number; totalSpent: number }[];
}

export const FrequentCustomersCard: React.FC<FrequentCustomersCardProps> = ({
  customers,
}) => {
  if (customers.length === 0) {
    return (
      <Card variant="elevated" padding={6}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.gray[900],
            marginBottom: spacing[4],
          }}
        >
          Frequent Customers
        </Text>
        <View
          style={{
            padding: spacing[4],
            backgroundColor: colors.gray[50],
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <FontAwesome name="users" size={24} color={colors.gray[400]} />
          <Text
            style={{
              fontSize: 14,
              color: colors.gray[600],
              marginTop: spacing[2],
              textAlign: "center",
            }}
          >
            No customer data available
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding={6}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: colors.gray[900],
          marginBottom: spacing[4],
        }}
      >
        Frequent Customers
      </Text>

      <View style={{ gap: spacing[3] }}>
        {customers
          .slice(0, 5)
          .map(({ customer, orderCount, totalSpent }, index) => (
            <TouchableOpacity
              key={customer.id}
              onPress={() => router.push(`/customers/${customer.id}` as any)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing[3],
                backgroundColor: colors.gray[50],
                borderRadius: 8,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary[100],
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: spacing[3],
                }}
              >
                <FontAwesome
                  name="user"
                  size={16}
                  color={colors.primary[600]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.gray[900],
                  }}
                >
                  {customer.name}
                </Text>
                {customer.company_name && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.gray[600],
                      marginTop: 2,
                    }}
                  >
                    {customer.company_name}
                  </Text>
                )}
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.gray[900],
                  }}
                >
                  {orderCount} orders
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.primary[600],
                    marginTop: 2,
                  }}
                >
                  ₹{totalSpent.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
      </View>
    </Card>
  );
};
