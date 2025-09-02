import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import {
  Card,
  Button,
  Badge,
  colors,
  spacing,
} from "@/components/DesignSystem";
import { BadgeText } from "@/components/ui/badge";
import { Database } from "@/types/database.types";

type Ledger = Database["public"]["Tables"]["ledgers"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface LedgerWithDetails extends Ledger {
  customer?: Customer | null;
}

interface LedgerCardProps {
  ledger: LedgerWithDetails;
}

export const LedgerCard: React.FC<LedgerCardProps> = ({ ledger }) => {
  const getBalanceVariant = (
    balance: number
  ): "success" | "error" | "secondary" => {
    if (balance > 0) return "success";
    if (balance < 0) return "error";
    return "secondary";
  };

  const balanceChange = ledger.current_balance - ledger.opening_balance;

  return (
    <Card
      variant="elevated"
      className="p-4 m-2"
      style={{
        marginBottom: spacing[3],
        borderLeftWidth: 4,
        borderLeftColor:
          ledger.current_balance >= 0 ? colors.success[500] : colors.error[500],
      }}
    >
      <View style={{ gap: spacing[3] }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.gray[900],
                marginBottom: spacing[1],
              }}
            >
              {ledger.customer?.name || "Unknown Customer"}
            </Text>
            {ledger.customer?.company_name && (
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[600],
                }}
              >
                {ledger.customer.company_name}
              </Text>
            )}
            {ledger.customer?.email && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.gray[500],
                  marginTop: spacing[1],
                }}
              >
                {ledger.customer.email}
              </Text>
            )}
          </View>

          <View style={{ alignItems: "flex-end", gap: spacing[1] }}>
            <Badge
              variant={getBalanceVariant(ledger.current_balance)}
              size="sm"
            >
              <BadgeText>
                {ledger.current_balance >= 0 ? "Credit" : "Debit"}
              </BadgeText>
            </Badge>
          </View>
        </View>

        {/* Balance Information */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: spacing[4],
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[600],
                marginBottom: spacing[1],
              }}
            >
              Opening Balance
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.gray[700],
              }}
            >
              ₹{ledger.opening_balance.toLocaleString()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[600],
                marginBottom: spacing[1],
              }}
            >
              Current Balance
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color:
                  ledger.current_balance >= 0
                    ? colors.success[600]
                    : colors.error[600],
              }}
            >
              ₹{Math.abs(ledger.current_balance).toLocaleString()}
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[600],
                marginBottom: spacing[1],
              }}
            >
              Change
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color:
                  balanceChange >= 0 ? colors.success[600] : colors.error[600],
              }}
            >
              {balanceChange >= 0 ? "+" : ""}₹{balanceChange.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: spacing[2],
            borderTopWidth: 1,
            borderTopColor: colors.gray[200],
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: colors.gray[500],
            }}
          >
            Created: {new Date(ledger.created_at).toLocaleDateString()}
          </Text>

          <Button
            title="View Details"
            onPress={() => router.push(`/ledgers/${ledger.id}` as any)}
            variant="outline"
            size="sm"
            icon="eye"
          />
        </View>
      </View>
    </Card>
  );
};
