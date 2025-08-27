import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { InventoryItem, InventoryInsert } from "@/types/inventory";
import { colors, spacing } from "@/components/DesignSystem";

interface InventoryModalProps {
  visible: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryInsert) => void;
  isLoading: boolean;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
  isLoading,
}) => {
  const [formData, setFormData] = useState<InventoryInsert>({
    name: "",
    quantity: 0,
    price: 0,
    gst: 18,
    hsn: "",
    description: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        gst: item.gst,
        hsn: item.hsn || "",
        description: item.description || "",
      });
    } else {
      setFormData({
        name: "",
        quantity: 0,
        price: 0,
        gst: 18,
        hsn: "",
        description: "",
      });
    }
  }, [item, visible]);

  const handleSave = () => {
    if (!formData.name?.trim()) {
      Alert.alert("Error", "Item name is required");
      return;
    }
    if ((formData.price || 0) <= 0) {
      Alert.alert("Error", "Price must be greater than 0");
      return;
    }
    if ((formData.quantity || 0) < 0) {
      Alert.alert("Error", "Quantity cannot be negative");
      return;
    }
    onSave(formData);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[4],
            borderBottomWidth: 1,
            borderBottomColor: colors.gray[200],
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.gray[900],
            }}
          >
            {item ? "Edit Item" : "Add Item"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <FontAwesome name="times" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={{ flex: 1, padding: spacing[6] }}>
          <View style={{ gap: spacing[4] }}>
            {/* Name */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[700],
                  marginBottom: spacing[2],
                }}
              >
                Item Name *
              </Text>
              <TextInput
                style={{
                  padding: spacing[3],
                  borderWidth: 1,
                  borderColor: colors.gray[300],
                  borderRadius: 8,
                  backgroundColor: colors.white,
                  fontSize: 16,
                }}
                placeholder="Enter item name"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            {/* Description */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[700],
                  marginBottom: spacing[2],
                }}
              >
                Description
              </Text>
              <TextInput
                style={{
                  padding: spacing[3],
                  borderWidth: 1,
                  borderColor: colors.gray[300],
                  borderRadius: 8,
                  backgroundColor: colors.white,
                  fontSize: 16,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
                placeholder="Enter item description"
                value={formData.description || ""}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Quantity and Price */}
            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.gray[700],
                    marginBottom: spacing[2],
                  }}
                >
                  Quantity *
                </Text>
                <TextInput
                  style={{
                    padding: spacing[3],
                    borderWidth: 1,
                    borderColor: colors.gray[300],
                    borderRadius: 8,
                    backgroundColor: colors.white,
                    fontSize: 16,
                  }}
                  placeholder="0"
                  value={(formData.quantity || 0).toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(text) || 0,
                    })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.gray[700],
                    marginBottom: spacing[2],
                  }}
                >
                  Price (₹) *
                </Text>
                <TextInput
                  style={{
                    padding: spacing[3],
                    borderWidth: 1,
                    borderColor: colors.gray[300],
                    borderRadius: 8,
                    backgroundColor: colors.white,
                    fontSize: 16,
                  }}
                  placeholder="0.00"
                  value={(formData.price || 0).toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(text) || 0,
                    })
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* GST and HSN */}
            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.gray[700],
                    marginBottom: spacing[2],
                  }}
                >
                  GST (%)
                </Text>
                <TextInput
                  style={{
                    padding: spacing[3],
                    borderWidth: 1,
                    borderColor: colors.gray[300],
                    borderRadius: 8,
                    backgroundColor: colors.white,
                    fontSize: 16,
                  }}
                  placeholder="18"
                  value={(formData.gst || 0).toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      gst: parseFloat(text) || 0,
                    })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.gray[700],
                    marginBottom: spacing[2],
                  }}
                >
                  HSN Code
                </Text>
                <TextInput
                  style={{
                    padding: spacing[3],
                    borderWidth: 1,
                    borderColor: colors.gray[300],
                    borderRadius: 8,
                    backgroundColor: colors.white,
                    fontSize: 16,
                  }}
                  placeholder="HSN Code"
                  value={formData.hsn || ""}
                  onChangeText={(text) =>
                    setFormData({ ...formData, hsn: text })
                  }
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            padding: spacing[6],
            borderTopWidth: 1,
            borderTopColor: colors.gray[200],
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: isLoading
                ? colors.gray[400]
                : colors.primary[500],
              padding: spacing[3],
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text
              style={{
                color: colors.white,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {isLoading ? "Saving..." : "Save Item"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
