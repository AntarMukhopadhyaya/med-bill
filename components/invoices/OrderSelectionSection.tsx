import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FormSection } from "@/components/FormComponents";
import { OrderWithCustomer } from "@/types/orders";
import { colors, spacing } from "@/components/DesignSystem";

interface OrderSelectionSectionProps {
  selectedOrder: OrderWithCustomer | null;
  orderSearch: string;
  onSelectOrder: () => void;
  onClearSelection: () => void;
}

export const OrderSelectionSection: React.FC<OrderSelectionSectionProps> = ({
  selectedOrder,
  orderSearch,
  onSelectOrder,
  onClearSelection,
}) => {
  return (
    <FormSection title="Order Selection (Optional)">
      <View style={{ marginBottom: spacing[4] }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.gray[700],
            marginBottom: spacing[2],
          }}
        >
          Select Order (Auto-fills invoice data)
        </Text>

        <TouchableOpacity
          onPress={onSelectOrder}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.gray[50],
            borderWidth: 1,
            borderColor: colors.gray[200],
            borderRadius: 8,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            minHeight: 52,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: selectedOrder ? colors.gray[900] : colors.gray[400],
              flex: 1,
            }}
          >
            {selectedOrder
              ? `${selectedOrder.order_number} - ₹${selectedOrder.total_amount?.toLocaleString()}`
              : "Tap to select an order"}
          </Text>
          <FontAwesome name="chevron-down" size={16} color={colors.gray[500]} />
        </TouchableOpacity>

        {selectedOrder && (
          <View
            style={{
              backgroundColor: colors.primary[50],
              borderRadius: 8,
              padding: spacing[3],
              marginTop: spacing[2],
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.primary[900],
                marginBottom: spacing[1],
              }}
            >
              Selected Order: {selectedOrder.order_number}
            </Text>
            <Text style={{ fontSize: 12, color: colors.primary[700] }}>
              Customer: {selectedOrder.customers?.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.primary[700] }}>
              Amount: ₹{selectedOrder.subtotal?.toLocaleString()} + Tax: ₹
              {selectedOrder.total_tax?.toLocaleString()}
            </Text>
            <TouchableOpacity
              onPress={onClearSelection}
              style={{ marginTop: spacing[2] }}
            >
              <Text style={{ color: colors.primary[600], fontSize: 12 }}>
                Clear Selection
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </FormSection>
  );
};
