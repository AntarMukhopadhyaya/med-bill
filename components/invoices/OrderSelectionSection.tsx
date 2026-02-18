import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FormSection } from "@/components/FormComponents";
import { OrderWithCustomer } from "@/types/orders";

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
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#374151",
            marginBottom: 8,
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
            backgroundColor: "#f9fafb",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 52,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: selectedOrder ? "#111827" : "#9ca3af",
              flex: 1,
            }}
          >
            {selectedOrder
              ? `${
                  selectedOrder.order_number
                } - ₹${selectedOrder.total_amount?.toLocaleString()}`
              : "Tap to select an order"}
          </Text>
          <FontAwesome name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>

        {selectedOrder && (
          <View
            style={{
              backgroundColor: "#eff6ff",
              borderRadius: 8,
              padding: 12,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#1d4ed8",
                marginBottom: 4,
              }}
            >
              Selected Order: {selectedOrder.order_number}
            </Text>
            <Text style={{ fontSize: 12, color: "#1d4ed8" }}>
              Customer: {selectedOrder.customers?.name}
            </Text>
            <Text style={{ fontSize: 12, color: "#1d4ed8" }}>
              Amount: ₹{selectedOrder.subtotal?.toLocaleString()} + Tax: ₹
              {selectedOrder.total_tax?.toLocaleString()}
            </Text>
            <TouchableOpacity
              onPress={onClearSelection}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: "#2563eb", fontSize: 12 }}>
                Clear Selection
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </FormSection>
  );
};
