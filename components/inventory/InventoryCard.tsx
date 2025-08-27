import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/DesignSystem";
import { InventoryItem } from "@/types/inventory";
import { colors, spacing } from "@/components/DesignSystem";

interface InventoryCardProps {
  item: InventoryItem;
  onPress: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const InventoryCardComponent: React.FC<InventoryCardProps> = ({
  item,
  onPress,
  onEdit,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
}) => {
  const isLowStock = item.quantity < 10;
  const isOutOfStock = item.quantity === 0;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      onLongPress={() => onPress(item)}
      delayLongPress={500}
    >
      <Card
        variant="elevated"
        padding={4}
        style={{
          borderColor: isSelected ? colors.primary[500] : colors.gray[200],
          borderWidth: isSelected ? 2 : 1,
        }}
      >
        <View style={{ gap: spacing[3] }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.gray[900],
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {isLowStock && (
                  <View
                    style={{
                      backgroundColor: isOutOfStock
                        ? colors.error[100]
                        : colors.warning[100],
                      paddingHorizontal: spacing[2],
                      paddingVertical: spacing[1],
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: isOutOfStock
                          ? colors.error[600]
                          : colors.warning[600],
                      }}
                    >
                      {isOutOfStock ? "Out of Stock" : "Low Stock"}
                    </Text>
                  </View>
                )}
              </View>

              {item.description && (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.gray[600],
                    marginTop: spacing[1],
                  }}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}
            </View>

            {!isSelectionMode && (
              <View style={{ flexDirection: "row", gap: spacing[2] }}>
                <TouchableOpacity
                  onPress={() => onEdit(item)}
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: colors.primary[50],
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome
                    name="edit"
                    size={14}
                    color={colors.primary[500]}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(item)}
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: colors.error[50],
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome
                    name="trash"
                    size={14}
                    color={colors.error[500]}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Details */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: spacing[2],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    marginBottom: 2,
                  }}
                >
                  Quantity
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: isOutOfStock ? colors.error[600] : colors.gray[900],
                  }}
                >
                  {item.quantity}
                </Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.gray[600],
                    marginBottom: 2,
                  }}
                >
                  Price
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.gray[900],
                  }}
                >
                  ₹{item.price.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end", gap: spacing[1] }}>
              {item.hsn && (
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  HSN: {item.hsn}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                GST: {item.gst}%
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export const InventoryCard = memo(InventoryCardComponent);
