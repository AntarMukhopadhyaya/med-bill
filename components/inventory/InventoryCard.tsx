import React, { memo } from "react";
import { FontAwesome } from "@expo/vector-icons";
import { InventoryItem } from "@/types/inventory";
import { BaseCard, BaseCardAction } from "@/components/shared/BaseCard";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";

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

  // Get status for stock level
  const getStockStatus = () => {
    if (isOutOfStock) {
      return {
        label: "Out of Stock",
        variant: "error" as const,
      };
    }
    if (isLowStock) {
      return {
        label: "Low Stock",
        variant: "warning" as const,
      };
    }
    return undefined;
  };

  // Additional inventory-specific actions
  const additionalActions: BaseCardAction[] = [
    {
      icon: "plus",
      colorClass: "text-success-600",
      backgroundClass: "bg-success-50",
      onPress: () => {
        /* Add stock increase logic */
      },
      label: "Add Stock",
    },
    {
      icon: "minus",
      colorClass: "text-warning-600",
      backgroundClass: "bg-warning-50",
      onPress: () => {
        /* Add stock decrease logic */
      },
      label: "Remove Stock",
    },
  ];

  // Stock and pricing info section
  const infoSection = (
    <HStack className="justify-between gap-4">
      <VStack className="items-center gap-1">
        <Text className="text-xs text-typography-600">Quantity</Text>
        <Text
          className={`text-base font-semibold ${
            isOutOfStock ? "text-error-600" : "text-typography-900"
          }`}
        >
          {item.quantity}
        </Text>
      </VStack>

      <VStack className="items-center gap-1">
        <Text className="text-xs text-typography-600">Price</Text>
        <Text className="text-base font-semibold text-typography-900">
          ₹{item.price.toLocaleString()}
        </Text>
      </VStack>

      <VStack className="items-end gap-1">
        {item.hsn && (
          <Text className="text-xs text-typography-600">HSN: {item.hsn}</Text>
        )}
        <Text className="text-xs text-typography-600">GST: {item.gst}%</Text>
      </VStack>
    </HStack>
  );

  return (
    <BaseCard
      title={item.name}
      subtitle={item.description || undefined}
      status={getStockStatus()}
      onPress={() => onPress(item)}
      onEdit={() => onEdit(item)}
      onDelete={() => onDelete(item)}
      onViewDetails={() => onPress(item)}
      additionalActions={!isSelectionMode ? additionalActions : []}
      infoSection={infoSection}
      isSelected={isSelected}
    />
  );
};

export const InventoryCard = memo(InventoryCardComponent);
