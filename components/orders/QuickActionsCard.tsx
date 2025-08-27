import React from "react";
import { View } from "react-native";
import { Card, SectionHeader, Button } from "@/components/DesignSystem";
import { spacing } from "@/components/DesignSystem";

interface QuickActionsCardProps {
  onCreateInvoice: () => void;
  onEditOrder: () => void;
  onViewCustomer: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onCreateInvoice,
  onEditOrder,
  onViewCustomer,
}) => {
  return (
    <Card variant="elevated" padding={6}>
      <SectionHeader title="Quick Actions" />

      <View style={{ gap: spacing[3] }}>
        <Button
          title="Create Invoice"
          onPress={onCreateInvoice}
          variant="primary"
          icon="file-text"
        />

        <View style={{ flexDirection: "row", gap: spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Edit Order"
              onPress={onEditOrder}
              variant="outline"
              icon="edit"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Customer"
              onPress={onViewCustomer}
              variant="outline"
              icon="user"
            />
          </View>
        </View>
      </View>
    </Card>
  );
};
