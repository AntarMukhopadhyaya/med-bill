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

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
    const price = parseFloat(value) || 0;
    onUpdatePrice(item.id, price);
  };

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.gray[200],
        padding: spacing[4],
        marginBottom: spacing[3],
      }}
    >
      {/* Item Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing[3],
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
            {item.item_name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.gray[500],
            }}
          >
            GST: {item.gst_percent}%
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onRemove(item.id)}
          style={{
            padding: spacing[2],
            borderRadius: 4,
          }}
        >
          <FontAwesome name="trash" size={16} color={colors.error[500]} />
        </TouchableOpacity>
      </View>

      {/* Quantity and Price Controls */}
      <View
        style={{
          flexDirection: "row",
          gap: spacing[3],
          marginBottom: spacing[3],
        }}
      >
        {/* Quantity */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.gray[700],
              marginBottom: spacing[1],
            }}
          >
            Quantity
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.gray[200],
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              style={{
                padding: spacing[2],
                backgroundColor: colors.gray[50],
              }}
            >
              <FontAwesome name="minus" size={12} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text
              style={{
                flex: 1,
                textAlign: "center",
                paddingVertical: spacing[2],
                fontSize: 14,
                fontWeight: "500",
                color: colors.gray[900],
              }}
            >
              {item.quantity}
            </Text>
            <TouchableOpacity
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
              style={{
                padding: spacing[2],
                backgroundColor: colors.gray[50],
              }}
            >
              <FontAwesome name="plus" size={12} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Unit Price */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.gray[700],
              marginBottom: spacing[1],
            }}
          >
            Unit Price
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.gray[50],
              borderWidth: 1,
              borderColor: colors.gray[200],
              borderRadius: 6,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[2],
              fontSize: 14,
              color: colors.gray[900],
            }}
            value={priceInput}
            onChangeText={handlePriceChange}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>
      </View>

      {/* Item Total */}
      <View
        style={{
          backgroundColor: colors.gray[50],
          padding: spacing[3],
          borderRadius: 6,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: spacing[1],
          }}
        >
          <Text style={{ fontSize: 12, color: colors.gray[600] }}>
            Subtotal ({item.quantity} × ₹{item.unit_price})
          </Text>
          <Text style={{ fontSize: 12, color: colors.gray[900] }}>
            ₹{(item.quantity * item.unit_price).toFixed(2)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: spacing[1],
          }}
        >
          <Text style={{ fontSize: 12, color: colors.gray[600] }}>
            Tax ({item.gst_percent}%)
          </Text>
          <Text style={{ fontSize: 12, color: colors.gray[900] }}>
            ₹{item.tax_amount}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopWidth: 1,
            borderTopColor: colors.gray[200],
            paddingTop: spacing[1],
          }}
        >
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: colors.gray[900] }}
          >
            Total
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.primary[600],
            }}
          >
            ₹{item.total_price}
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
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  totalTax,
  total,
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
