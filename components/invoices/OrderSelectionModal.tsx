import React from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SearchBar } from "@/components/SearchBar";
import { OrderWithCustomerAndItems, OrderWithRelations } from "@/types/orders";
import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";

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
  const insets = useSafeAreaInsets();

  return (
    <Modal isOpen={visible} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="w-full h-full max-w-full max-h-full m-0 rounded-none bg-background-50">
        <VStack className="flex-1">
          {/* Header */}
          <VStack
            className="bg-background-0 px-4 border-b border-outline-200 shrink-0"
            style={{ paddingTop: insets.top + 20, paddingBottom: 16 }}
          >
            <HStack className="items-center justify-between mb-4">
              <Text className="text-xl font-semibold text-typography-900 flex-1">
                Select Order
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 items-center justify-center rounded-full bg-background-100"
              >
                <FontAwesome
                  name="times"
                  size={18}
                  color="rgb(var(--color-typography-600))"
                />
              </TouchableOpacity>
            </HStack>

            <SearchBar
              value={orderSearch}
              onChange={onOrderSearch}
              placeholder="Search orders by number..."
            />
          </VStack>

          {/* Orders List */}
          <VStack className="flex-1 px-4">
            {orders.length === 0 ? (
              <VStack className="flex-1 justify-center items-center py-8 px-4">
                <FontAwesome
                  name="file-text-o"
                  size={48}
                  color="rgb(var(--color-typography-400))"
                  style={{ marginBottom: 16 }}
                />
                <Text className="text-base text-typography-500 text-center px-4">
                  {orderSearch
                    ? "No orders found"
                    : "No delivered orders available for invoicing"}
                </Text>
              </VStack>
            ) : (
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingVertical: 16 }}
                showsVerticalScrollIndicator={false}
              >
                <VStack className="gap-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onSelect={() => onSelectOrder(order)}
                    />
                  ))}
                </VStack>
              </ScrollView>
            )}
          </VStack>
        </VStack>
      </ModalContent>
    </Modal>
  );
};

const OrderCard: React.FC<{
  order: OrderWithCustomerAndItems;
  onSelect: () => void;
}> = ({ order, onSelect }) => (
  <TouchableOpacity
    onPress={onSelect}
    className="bg-background-0 rounded-lg border border-outline-200 p-3 active:bg-background-100"
  >
    <VStack className="gap-3">
      {/* Header row with order number and amount */}
      <HStack className="justify-between items-start">
        <VStack className="flex-1 pr-3">
          <Text
            className="text-base font-semibold text-typography-900 mb-1"
            numberOfLines={1}
          >
            {order.order_number}
          </Text>
          <Text className="text-sm text-typography-600 mb-1" numberOfLines={1}>
            {order.customers?.name || "Unknown Customer"}
          </Text>
        </VStack>
        <VStack className="items-end shrink-0">
          <Text className="text-lg font-semibold text-primary-600 mb-1">
            ₹{order.total_amount?.toLocaleString()}
          </Text>
          <Box className="bg-success-100 px-2 py-1 rounded">
            <Text className="text-xs font-medium text-success-700">
              {order.order_status?.toUpperCase()}
            </Text>
          </Box>
        </VStack>
      </HStack>

      {/* Date and items info */}
      <VStack className="gap-2">
        <Text className="text-xs text-typography-500">
          Date:{" "}
          {new Date(order.order_date || order.created_at).toLocaleDateString()}
        </Text>

        {order.order_items && order.order_items.length > 0 && (
          <VStack className="border-t border-outline-100 pt-2 gap-1">
            <Text className="text-xs text-typography-500">
              Items: {order.order_items.length}
            </Text>
            <Text className="text-xs text-typography-400" numberOfLines={2}>
              {order.order_items.map((item) => item.item_name).join(", ")}
            </Text>
          </VStack>
        )}
      </VStack>
    </VStack>
  </TouchableOpacity>
);
