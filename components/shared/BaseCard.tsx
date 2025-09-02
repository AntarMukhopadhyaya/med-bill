import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";

// Helper function to get icon colors based on action type
const getIconColor = (colorClass: string) => {
  switch (colorClass) {
    case "text-info-600":
      return "rgb(var(--color-info-600))";
    case "text-error-600":
      return "rgb(var(--color-error-600))";
    case "text-typography-600":
      return "rgb(var(--color-typography-600))";
    default:
      return "rgb(var(--color-typography-600))";
  }
};

export interface BaseCardAction {
  icon: string;
  colorClass: string; // NativeWind color class
  backgroundClass: string; // NativeWind background class
  onPress: () => void;
  label?: string;
}

export interface BaseCardProps {
  // Main content
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    variant: "primary" | "secondary" | "success" | "warning" | "error";
  };

  // Navigation
  onPress: () => void;

  // Standard actions (always present)
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails?: () => void;

  // Additional module-specific actions
  additionalActions?: BaseCardAction[];

  // Content areas
  infoSection?: React.ReactNode;
  detailsSection?: React.ReactNode;

  // Visual state
  isSelected?: boolean;
  showChevron?: boolean;
}

const BaseCardComponent: React.FC<BaseCardProps> = ({
  title,
  subtitle,
  status,
  onPress,
  onEdit,
  onDelete,
  onViewDetails,
  additionalActions = [],
  infoSection,
  detailsSection,
  isSelected = false,
  showChevron = true,
}) => {
  const standardActions: BaseCardAction[] = [
    // View Details (if provided)
    ...(onViewDetails
      ? [
          {
            icon: "eye",
            colorClass: "text-info-600",
            backgroundClass: "bg-info-50",
            onPress: onViewDetails,
            label: "View Details",
          },
        ]
      : []),

    // Edit
    {
      icon: "edit",
      colorClass: "text-typography-600",
      backgroundClass: "bg-background-100",
      onPress: onEdit,
      label: "Edit",
    },

    // Delete
    {
      icon: "trash",
      colorClass: "text-error-600",
      backgroundClass: "bg-error-50",
      onPress: onDelete,
      label: "Delete",
    },
  ];

  const allActions = [...additionalActions, ...standardActions];

  return (
    <TouchableOpacity onPress={onPress}>
      <Box
        className={`
          bg-background-0 rounded-xl p-4 shadow-sm
          ${
            isSelected
              ? "border-2 border-primary-500"
              : "border border-outline-200"
          }
        `}
      >
        <VStack space="md">
          {/* Header */}
          <HStack space="sm" className="justify-between items-center">
            <VStack space="xs" className="flex-1">
              <Text
                className="text-base font-semibold text-typography-900"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              {subtitle && (
                <Text className="text-sm text-typography-600">{subtitle}</Text>
              )}
            </VStack>

            <HStack space="sm" className="items-center">
              {status && (
                <Badge
                  variant={status.variant}
                  size="sm"
                  className={`bg-${status.variant}-100 border-${status.variant}-200`}
                >
                  <BadgeText className={`text-${status.variant}-800`}>
                    {status.label}
                  </BadgeText>
                </Badge>
              )}

              {showChevron && (
                <FontAwesome
                  name="chevron-right"
                  size={14}
                  color="rgb(var(--color-typography-400))"
                />
              )}
            </HStack>
          </HStack>

          {/* Info Section */}
          {infoSection && (
            <VStack space="xs" className="p-3 bg-background-100 rounded-md">
              {infoSection}
            </VStack>
          )}

          {/* Details Section */}
          {detailsSection && <VStack space="sm">{detailsSection}</VStack>}

          {/* Actions */}
          <HStack
            space="sm"
            className="justify-end pt-3 border-t border-outline-100"
          >
            {allActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                className={`
                  ${action.backgroundClass} p-3 rounded-md
                  min-w-[36px] min-h-[36px] items-center justify-center
                `}
              >
                <FontAwesome
                  name={action.icon as any}
                  size={16}
                  color={getIconColor(action.colorClass)}
                />
              </TouchableOpacity>
            ))}
          </HStack>
        </VStack>
      </Box>
    </TouchableOpacity>
  );
};

export const BaseCard = memo(BaseCardComponent);
