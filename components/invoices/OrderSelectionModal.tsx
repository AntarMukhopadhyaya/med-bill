import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SearchBar } from "@/components/SearchBar";
import { OrderWithCustomerAndItems, OrderWithRelations } from "@/types/orders";
import { colors, spacing } from "@/components/DesignSystem";

interface OrderSelectionModalProps {
  visible: boolean;
  orders: OrderWithCustomerAndItems[];
  orderSearch: string;
  onOrderSearch: (search: string) => void;
  onSelectOrder: (order: OrderWithCustomerAndItems) => void;
  onClose: () => void;
}

export const OrderSelectionModal: React.FC<OrderSelectionModalProps> = ({
  visible,
  orders,
  orderSearch,
  onOrderSearch,
  onSelectOrder,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "white",
            paddingTop: spacing[12],
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[4],
            borderBottomWidth: 1,
            borderBottomColor: colors.gray[200],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing[4],
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.gray[900],
              }}
            >
              Select Order
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={20} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <SearchBar
            value={orderSearch}
            onChange={onOrderSearch}
            placeholder="Search orders by number..."
          />
        </View>

        {/* Orders List */}
        <ScrollView style={{ flex: 1, padding: spacing[4] }}>
          {orders.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: spacing[8],
              }}
            >
              <FontAwesome
                name="file-text-o"
                size={48}
                color={colors.gray[400]}
                style={{ marginBottom: spacing[4] }}
              />
              <Text
                style={{
                  fontSize: 16,
                  color: colors.gray[500],
                  textAlign: "center",
                }}
              >
                {orderSearch
                  ? "No orders found"
                  : "No delivered orders available for invoicing"}
              </Text>
            </View>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onSelect={() => onSelectOrder(order)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const OrderCard: React.FC<{
  order: OrderWithCustomerAndItems;
  onSelect: () => void;
}> = ({ order, onSelect }) => (
  <TouchableOpacity
    onPress={onSelect}
    style={{
      backgroundColor: colors.white,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.gray[200],
      padding: spacing[4],
      marginBottom: spacing[3],
    }}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing[2],
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
          {order.order_number}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.gray[600],
            marginBottom: spacing[1],
          }}
        >
          {order.customers?.name || "Unknown Customer"}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.gray[500],
          }}
        >
          Date:{" "}
          {new Date(order.order_date || order.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.primary[600],
            marginBottom: spacing[1],
          }}
        >
          ₹{order.total_amount?.toLocaleString()}
        </Text>
        <View
          style={{
            backgroundColor: colors.success[100],
            paddingHorizontal: spacing[2],
            paddingVertical: spacing[1],
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "500",
              color: colors.success[700],
            }}
          >
            {order.order_status?.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>

    {order.order_items && order.order_items.length > 0 && (
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.gray[100],
          paddingTop: spacing[2],
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.gray[500],
            marginBottom: spacing[1],
          }}
        >
          Items: {order.order_items.length}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: colors.gray[400],
          }}
          numberOfLines={1}
        >
          {order.order_items.map((item) => item.item_name).join(", ")}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);
