import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native"; // retain RN primitives still used for some legacy parts
import { Input, InputField, InputSlot, InputIcon } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/components/DesignSystem";
import {
  Modal as GSModal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { FormInput, FormButton } from "@/components/FormComponents";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];

export interface OrderItem {
  id: string;
  item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  gst_percent: number;
  tax_amount: number;
  total_price: number;
}

// Customer Selection Modal Component
interface CustomerSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomerId?: string;
}

export const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({
  visible,
  onClose,
  onSelectCustomer,
  selectedCustomerId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", searchQuery],
    queryFn: async () => {
      let query = supabase.from("customers").select("*").order("name");

      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: visible,
  });

  const renderCustomer = ({ item: customer }: { item: Customer }) => {
    const active = selectedCustomerId === customer.id;
    return (
      <Pressable
        onPress={() => {
          onSelectCustomer(customer);
          onClose();
        }}
        className={`px-4 py-3 border-b border-outline-100 ${
          active ? "bg-primary-50" : "bg-background-0"
        }`}
      >
        <HStack className="justify-between">
          <VStack className="flex-1">
            <UIText className="text-base font-semibold text-typography-900 mb-1">
              {customer.name}
            </UIText>
            {customer.company_name && (
              <UIText className="text-sm text-typography-600 mb-1">
                {customer.company_name}
              </UIText>
            )}
            <UIText className="text-xs text-typography-500">
              {customer.email} • {customer.phone}
            </UIText>
          </VStack>
          {active && (
            <FontAwesome name="check" size={16} color={colors.primary[500]} />
          )}
        </HStack>
      </Pressable>
    );
  };

  return (
    <GSModal isOpen={visible} onClose={onClose} size="full">
      <ModalBackdrop onPress={onClose} />
      <ModalContent className="flex-1 w-full h-full rounded-none border-0 p-0">
        <VStack className="flex-1 bg-background">
          <Box className="pt-12 px-4 pb-4 bg-background-0 border-b border-border">
            <HStack className="items-center justify-between mb-4">
              <UIText className="text-lg font-semibold text-typography-900">
                Select Customer
              </UIText>
              <Pressable onPress={onClose} className="p-2 rounded-md">
                <FontAwesome name="times" size={20} color={colors.gray[500]} />
              </Pressable>
            </HStack>
            <Input className="w-full">
              <InputSlot className="pl-3">
                <InputIcon
                  as={() => (
                    <FontAwesome
                      name="search"
                      size={16}
                      color={colors.gray[400]}
                    />
                  )}
                />
              </InputSlot>
              <InputField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search customers by name, email, or phone..."
                autoFocus
                className="text-base"
              />
            </Input>
          </Box>
          <VStack className="flex-1">
            <FlatList
              data={customers}
              renderItem={renderCustomer}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <VStack className="flex-1 items-center justify-center p-8">
                  <FontAwesome
                    name="users"
                    size={48}
                    color={colors.gray[300]}
                    style={{ marginBottom: 16 }}
                  />
                  <UIText className="text-base text-typography-500 text-center">
                    {isLoading
                      ? "Loading customers..."
                      : searchQuery
                      ? "No customers found"
                      : "No customers available"}
                  </UIText>
                </VStack>
              }
            />
          </VStack>
        </VStack>
      </ModalContent>
    </GSModal>
  );
};

// Item Selection Modal Component
interface ItemSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectItem: (item: InventoryItem) => void;
  selectedItems: OrderItem[];
}

export const ItemSelectionModal: React.FC<ItemSelectionModalProps> = ({
  visible,
  onClose,
  onSelectItem,
  selectedItems,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["inventory", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select("*")
        .gt("quantity", 0)
        .order("name");

      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,hsn.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: visible,
  });

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isSelected = selectedItems.some(
      (selectedItem) => selectedItem.item_id === item.id
    );
    const selectedQuantity =
      selectedItems.find((selectedItem) => selectedItem.item_id === item.id)
        ?.quantity || 0;

    return (
      <Pressable
        onPress={() => onSelectItem(item)}
        className={`px-4 py-3 border-b border-outline-100 ${
          isSelected ? "bg-primary-50" : "bg-background-0"
        }`}
      >
        <HStack className="justify-between">
          <VStack className="flex-1 mr-2">
            <UIText className="text-base font-semibold text-typography-900 mb-1">
              {item.name}
            </UIText>
            {item.description && (
              <UIText
                className="text-sm text-typography-600 mb-1"
                numberOfLines={2}
              >
                {item.description}
              </UIText>
            )}
            <HStack className="items-center flex-wrap gap-3">
              <UIText className="text-sm font-semibold text-primary-600">
                ₹{item.price}
              </UIText>
              <UIText className="text-xs text-typography-500">
                Stock: {item.quantity}
              </UIText>
              {item.gst && (
                <UIText className="text-xs text-typography-500">
                  GST: {item.gst}%
                </UIText>
              )}
            </HStack>
          </VStack>
          <VStack className="items-center justify-center">
            {isSelected && (
              <Box className="bg-primary-500 rounded-md px-2 py-0.5 mb-1">
                <UIText className="text-xs font-semibold text-background-0">
                  {selectedQuantity}
                </UIText>
              </Box>
            )}
            <FontAwesome
              name={isSelected ? "check" : "plus"}
              size={16}
              color={isSelected ? colors.primary[500] : colors.gray[400]}
            />
          </VStack>
        </HStack>
      </Pressable>
    );
  };

  return (
    <GSModal isOpen={visible} onClose={onClose} size="full">
      <ModalBackdrop onPress={onClose} />
      <ModalContent className="flex-1 w-full h-full rounded-none border-0 p-0">
        <VStack className="flex-1 bg-background">
          <Box className="pt-12 px-4 pb-4 bg-background-0 border-b border-border">
            <HStack className="items-center justify-between mb-4">
              <UIText className="text-lg font-semibold text-typography-900">
                Add Items
              </UIText>
              <Pressable onPress={onClose} className="p-2 rounded-md">
                <FontAwesome name="times" size={20} color={colors.gray[500]} />
              </Pressable>
            </HStack>
            <Box className="relative">
              <FontAwesome
                name="search"
                size={16}
                color={colors.gray[400]}
                style={{ position: "absolute", left: 12, top: 12, zIndex: 1 }}
              />
              <Input className="w-full">
                <InputSlot className="pl-3">
                  <InputIcon
                    as={() => (
                      <FontAwesome
                        name="search"
                        size={16}
                        color={colors.gray[400]}
                      />
                    )}
                  />
                </InputSlot>
                <InputField
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search items by name, description, or HSN..."
                  autoFocus
                  className="text-base"
                />
              </Input>
            </Box>
          </Box>
          <VStack className="flex-1">
            <FlatList
              data={inventoryItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <VStack className="flex-1 items-center justify-center p-8">
                  <FontAwesome
                    name="cube"
                    size={48}
                    color={colors.gray[300]}
                    style={{ marginBottom: 16 }}
                  />
                  <UIText className="text-base text-typography-500 text-center">
                    {isLoading
                      ? "Loading items..."
                      : searchQuery
                      ? "No items found"
                      : "No items available"}
                  </UIText>
                </VStack>
              }
            />
          </VStack>
        </VStack>
      </ModalContent>
    </GSModal>
  );
};

// Order Item Card Component
interface OrderItemCardProps {
  item: OrderItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdatePrice: (itemId: string, price: number) => void;
  onRemove: (itemId: string) => void;
}

export const OrderItemCard: React.FC<OrderItemCardProps> = ({
  item,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
}) => {
  const [priceInput, setPriceInput] = useState(item.unit_price.toString());
  const [quantityInput, setQuantityInput] = useState(item.quantity.toString());

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
    const price = parseFloat(value) || 0;
    if (price >= 0) {
      onUpdatePrice(item.id, price);
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantityInput(value);

    // Allow empty input for better UX
    if (value === "") {
      return;
    }

    const newQuantity = parseInt(value.replace(/[^0-9]/g, "")) || 0;
    if (newQuantity >= 0) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const handleQuantityBlur = () => {
    // If input is empty or 0, set to 1 (minimum quantity)
    if (quantityInput === "" || quantityInput === "0") {
      const newQuantity = 1;
      setQuantityInput(newQuantity.toString());
      onUpdateQuantity(item.id, newQuantity);
    } else {
      // Sync with current item quantity in case it was updated elsewhere
      setQuantityInput(item.quantity.toString());
    }
  };

  const handlePriceBlur = () => {
    // If price input is empty, set to current price
    if (priceInput === "") {
      setPriceInput(item.unit_price.toString());
    } else {
      // Sync with current item price
      setPriceInput(item.unit_price.toString());
    }
  };

  const incrementQuantity = () => {
    const newQuantity = item.quantity + 1;
    setQuantityInput(newQuantity.toString());
    onUpdateQuantity(item.id, newQuantity);
  };

  const decrementQuantity = () => {
    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;
      setQuantityInput(newQuantity.toString());
      onUpdateQuantity(item.id, newQuantity);
    } else {
      // If quantity is 1, remove the item instead of going to 0
      onRemove(item.id);
    }
  };

  // Calculate subtotal to avoid text clipping
  const subtotal = item.quantity * item.unit_price;
  const subtotalText = `${item.quantity} × ₹${item.unit_price.toFixed(
    2
  )} = ₹${subtotal.toFixed(2)}`;

  return (
    <Box className="bg-background-0 border border-outline-200 rounded-xl p-4 mb-4">
      <VStack space="4">
        <HStack className="justify-between items-start mb-4">
          <VStack className="flex-1 mr-2">
            <UIText
              className="text-base font-semibold text-typography-900 mb-1"
              numberOfLines={2}
            >
              {item.item_name}
            </UIText>
            <HStack className="items-center flex-wrap gap-2">
              <UIText className="text-[11px] text-typography-600 bg-background px-2 py-0.5 rounded">
                GST: {item.gst_percent}%
              </UIText>
              <UIText className="text-[11px] text-typography-500">
                Item ID: {item.item_id.slice(0, 8)}
              </UIText>
            </HStack>
          </VStack>
          <Pressable
            onPress={() => onRemove(item.id)}
            className="p-2 rounded-md bg-error-50 border border-error-300"
            accessibilityLabel="Remove item"
            accessibilityHint="Removes this item from the order"
          >
            <FontAwesome name="trash" size={16} color={colors.error[600]} />
          </Pressable>
        </HStack>

        <HStack className="gap-4 mb-4">
          <VStack className="flex-1">
            <UIText className="text-sm font-semibold text-typography-700 mb-2">
              Quantity
            </UIText>
            <HStack className="items-center bg-background border border-outline-300 rounded-lg overflow-hidden min-h-12">
              <Pressable
                onPress={decrementQuantity}
                className="px-3 py-3 bg-background-50 min-w-12 items-center justify-center"
                accessibilityLabel="Decrease quantity"
                accessibilityHint="Decreases the quantity by 1"
              >
                <FontAwesome name="minus" size={14} color={colors.gray[700]} />
              </Pressable>
              <Input className="flex-1">
                <InputField
                  value={quantityInput}
                  onChangeText={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  accessibilityLabel="Quantity input"
                  accessibilityHint="Enter the quantity for this item"
                  className="text-center text-base font-semibold"
                />
              </Input>
              <Pressable
                onPress={incrementQuantity}
                className="px-3 py-3 bg-background-50 min-w-12 items-center justify-center"
                accessibilityLabel="Increase quantity"
                accessibilityHint="Increases the quantity by 1"
              >
                <FontAwesome name="plus" size={14} color={colors.gray[700]} />
              </Pressable>
            </HStack>
          </VStack>
          <VStack className="flex-1">
            <UIText className="text-sm font-semibold text-typography-700 mb-2">
              Unit Price (₹)
            </UIText>
            <Input className="w-full">
              <InputSlot className="pl-3">
                <InputIcon
                  as={() => (
                    <UIText className="text-base text-typography-500">₹</UIText>
                  )}
                />
              </InputSlot>
              <InputField
                value={priceInput}
                onChangeText={handlePriceChange}
                onBlur={handlePriceBlur}
                keyboardType="decimal-pad"
                placeholder="0.00"
                selectTextOnFocus
                accessibilityLabel="Unit price input"
                accessibilityHint="Enter the unit price for this item"
                className="text-base font-semibold"
              />
            </Input>
          </VStack>
        </HStack>

        <Box className="bg-background border border-outline-200 rounded-lg p-4">
          <HStack className="justify-between items-start mb-2 flex-wrap">
            <UIText className="text-[13px] text-typography-600 font-medium flex-1 min-w-20 mr-2">
              Subtotal
            </UIText>
            <UIText className="text-[13px] text-typography-900 font-semibold flex-2 text-right">
              {subtotalText}
            </UIText>
          </HStack>
          <HStack className="justify-between items-center mb-2">
            <UIText className="text-[13px] text-typography-600 font-medium">
              Tax ({item.gst_percent}%)
            </UIText>
            <UIText className="text-[13px] text-typography-900 font-semibold">
              ₹{item.tax_amount.toFixed(2)}
            </UIText>
          </HStack>
          <Box className="h-px bg-outline-200 my-2" />
          <HStack className="justify-between items-center">
            <UIText className="text-sm font-bold text-typography-900">
              Item Total
            </UIText>
            <UIText className="text-sm font-bold text-primary-600">
              ₹{item.total_price.toFixed(2)}
            </UIText>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

// Order Summary Component
interface OrderSummaryProps {
  subtotal: number;
  totalTax: number;
  total: number;
  deliveryCharge: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  totalTax,
  total,
  deliveryCharge,
}) => {
  return (
    <View
      style={{
        backgroundColor: colors.primary[50],
        borderRadius: 8,
        padding: spacing[4],
        borderWidth: 1,
        borderColor: colors.primary[200],
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.primary[900],
          marginBottom: spacing[3],
        }}
      >
        Order Summary
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing[2],
        }}
      >
        <Text style={{ fontSize: 14, color: colors.gray[700] }}>Subtotal</Text>
        <Text style={{ fontSize: 14, color: colors.gray[900] }}>
          ₹{subtotal}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacing[2],
        }}
      >
        <Text style={{ fontSize: 14, color: colors.gray[700] }}>Total Tax</Text>
        <Text style={{ fontSize: 14, color: colors.gray[900] }}>
          ₹{totalTax}
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text>Delivery Charge:</Text>
        <Text>₹{deliveryCharge.toFixed(2)}</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: colors.primary[300],
          paddingTop: spacing[2],
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: colors.primary[900],
          }}
        >
          Total Amount
        </Text>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: colors.primary[900],
          }}
        >
          ₹{total}
        </Text>
      </View>
    </View>
  );
};
