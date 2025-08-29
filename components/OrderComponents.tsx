import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/components/DesignSystem";
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

  const renderCustomer = ({ item: customer }: { item: Customer }) => (
    <TouchableOpacity
      onPress={() => {
        onSelectCustomer(customer);
        onClose();
      }}
      style={{
        padding: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
        backgroundColor:
          selectedCustomerId === customer.id ? colors.primary[50] : "white",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.gray[900],
              marginBottom: spacing[1],
            }}
          >
            {customer.name}
          </Text>
          {customer.company_name && (
            <Text
              style={{
                fontSize: 14,
                color: colors.gray[600],
                marginBottom: spacing[1],
              }}
            >
              {customer.company_name}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.gray[500] }}>
            {customer.email} • {customer.phone}
          </Text>
        </View>
        {selectedCustomerId === customer.id && (
          <FontAwesome name="check" size={16} color={colors.primary[500]} />
        )}
      </View>
    </TouchableOpacity>
  );

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
              Select Customer
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={20} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={{ position: "relative" }}>
            <FontAwesome
              name="search"
              size={16}
              color={colors.gray[400]}
              style={{
                position: "absolute",
                left: spacing[3],
                top: spacing[3],
                zIndex: 1,
              }}
            />
            <TextInput
              style={{
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.gray[300],
                borderRadius: 8,
                paddingLeft: spacing[10],
                paddingRight: spacing[4],
                paddingVertical: spacing[3],
                fontSize: 16,
              }}
              placeholder="Search customers by name, email, or phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </View>

        {/* Customer List */}
        <FlatList
          data={customers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View
              style={{
                padding: spacing[8],
                alignItems: "center",
              }}
            >
              <FontAwesome
                name="users"
                size={48}
                color={colors.gray[300]}
                style={{ marginBottom: spacing[4] }}
              />
              <Text
                style={{
                  fontSize: 16,
                  color: colors.gray[500],
                  textAlign: "center",
                }}
              >
                {isLoading
                  ? "Loading customers..."
                  : searchQuery
                    ? "No customers found"
                    : "No customers available"}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
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
      <TouchableOpacity
        onPress={() => {
          onSelectItem(item);
        }}
        style={{
          padding: spacing[4],
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[200],
          backgroundColor: isSelected ? colors.primary[50] : "white",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.gray[900],
                marginBottom: spacing[1],
              }}
            >
              {item.name}
            </Text>
            {item.description && (
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[600],
                  marginBottom: spacing[1],
                }}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[4],
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.primary[600],
                }}
              >
                ₹{item.price}
              </Text>
              <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                Stock: {item.quantity}
              </Text>
              {item.gst && (
                <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                  GST: {item.gst}%
                </Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            {isSelected && (
              <View
                style={{
                  backgroundColor: colors.primary[500],
                  borderRadius: 12,
                  paddingHorizontal: spacing[2],
                  paddingVertical: spacing[1],
                  marginBottom: spacing[1],
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {selectedQuantity}
                </Text>
              </View>
            )}
            <FontAwesome
              name={isSelected ? "check" : "plus"}
              size={16}
              color={isSelected ? colors.primary[500] : colors.gray[400]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
              Add Items
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={20} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={{ position: "relative" }}>
            <FontAwesome
              name="search"
              size={16}
              color={colors.gray[400]}
              style={{
                position: "absolute",
                left: spacing[3],
                top: spacing[3],
                zIndex: 1,
              }}
            />
            <TextInput
              style={{
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.gray[300],
                borderRadius: 8,
                paddingLeft: spacing[10],
                paddingRight: spacing[4],
                paddingVertical: spacing[3],
                fontSize: 16,
              }}
              placeholder="Search items by name, description, or HSN..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </View>

        {/* Items List */}
        <FlatList
          data={inventoryItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View
              style={{
                padding: spacing[8],
                alignItems: "center",
              }}
            >
              <FontAwesome
                name="cube"
                size={48}
                color={colors.gray[300]}
                style={{ marginBottom: spacing[4] }}
              />
              <Text
                style={{
                  fontSize: 16,
                  color: colors.gray[500],
                  textAlign: "center",
                }}
              >
                {isLoading
                  ? "Loading items..."
                  : searchQuery
                    ? "No items found"
                    : "No items available"}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
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
  const subtotalText = `${item.quantity} × ₹${item.unit_price.toFixed(2)} = ₹${subtotal.toFixed(2)}`;

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.gray[200],
        padding: spacing[4],
        marginBottom: spacing[4],
        shadowColor: colors.gray[300],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {/* Item Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing[4],
        }}
      >
        <View style={{ flex: 1, marginRight: spacing[2] }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.gray[900],
              marginBottom: spacing[1],
            }}
            numberOfLines={2}
          >
            {item.item_name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[500],
                backgroundColor: colors.gray[100],
                paddingHorizontal: spacing[2],
                paddingVertical: spacing[1],
                borderRadius: 4,
              }}
            >
              GST: {item.gst_percent}%
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[500],
              }}
            >
              Item ID: {item.item_id.slice(0, 8)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onRemove(item.id)}
          style={{
            padding: spacing[2],
            borderRadius: 6,
            backgroundColor: colors.error[50],
            borderWidth: 1,
            borderColor: colors.error[300],
          }}
          accessibilityLabel="Remove item"
          accessibilityHint="Removes this item from the order"
        >
          <FontAwesome name="trash" size={16} color={colors.error[600]} />
        </TouchableOpacity>
      </View>

      {/* Quantity and Price Controls */}
      <View
        style={{
          flexDirection: "row",
          gap: spacing[4],
          marginBottom: spacing[4],
        }}
      >
        {/* Quantity */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.gray[700],
              marginBottom: spacing[2],
            }}
          >
            Quantity
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.gray[50],
              borderWidth: 1,
              borderColor: colors.gray[300],
              borderRadius: 8,
              overflow: "hidden",
              minHeight: 48,
            }}
          >
            <TouchableOpacity
              onPress={decrementQuantity}
              style={{
                padding: spacing[3],
                backgroundColor: colors.gray[100],
                minWidth: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Decrease quantity"
              accessibilityHint="Decreases the quantity by 1"
            >
              <FontAwesome name="minus" size={14} color={colors.gray[700]} />
            </TouchableOpacity>

            <TextInput
              value={quantityInput}
              onChangeText={handleQuantityChange}
              onBlur={handleQuantityBlur}
              keyboardType="number-pad"
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 16,
                fontWeight: "600",
                color: colors.gray[900],
                padding: spacing[2],
                minHeight: 48,
              }}
              selectTextOnFocus
              accessibilityLabel="Quantity input"
              accessibilityHint="Enter the quantity for this item"
            />

            <TouchableOpacity
              onPress={incrementQuantity}
              style={{
                padding: spacing[3],
                backgroundColor: colors.gray[100],
                minWidth: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Increase quantity"
              accessibilityHint="Increases the quantity by 1"
            >
              <FontAwesome name="plus" size={14} color={colors.gray[700]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Unit Price */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.gray[700],
              marginBottom: spacing[2],
            }}
          >
            Unit Price (₹)
          </Text>
          <View style={{ position: "relative" }}>
            <Text
              style={{
                position: "absolute",
                left: spacing[3],
                top: 14,
                fontSize: 16,
                color: colors.gray[500],
                zIndex: 1,
              }}
            >
              ₹
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.gray[50],
                borderWidth: 1,
                borderColor: colors.gray[300],
                borderRadius: 8,
                paddingHorizontal: spacing[8],
                paddingVertical: spacing[3],
                fontSize: 16,
                fontWeight: "600",
                color: colors.gray[900],
                minHeight: 48,
              }}
              value={priceInput}
              onChangeText={handlePriceChange}
              onBlur={handlePriceBlur}
              keyboardType="decimal-pad"
              placeholder="0.00"
              selectTextOnFocus
              accessibilityLabel="Unit price input"
              accessibilityHint="Enter the unit price for this item"
            />
          </View>
        </View>
      </View>

      {/* Item Total */}
      <View
        style={{
          backgroundColor: colors.gray[100],
          padding: spacing[4],
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.gray[200],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: spacing[2],
            flexWrap: "wrap",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: colors.gray[600],
              fontWeight: "500",
              flex: 1,
              minWidth: 80,
              marginRight: spacing[2],
            }}
          >
            Subtotal
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.gray[900],
              fontWeight: "600",
              flex: 2,
              textAlign: "right",
              flexWrap: "wrap",
            }}
          >
            {subtotalText}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing[2],
          }}
        >
          <Text
            style={{ fontSize: 13, color: colors.gray[600], fontWeight: "500" }}
          >
            Tax ({item.gst_percent}%)
          </Text>
          <Text
            style={{ fontSize: 13, color: colors.gray[900], fontWeight: "600" }}
          >
            ₹{item.tax_amount.toFixed(2)}
          </Text>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: colors.gray[300],
            marginVertical: spacing[2],
          }}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{ fontSize: 15, fontWeight: "700", color: colors.gray[900] }}
          >
            Item Total
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.primary[600],
            }}
          >
            ₹{item.total_price.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
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
