import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "file-text-o",
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <VStack
      className="flex-1 justify-center items-center py-12 px-4"
      space="lg"
    >
      {icon && <FontAwesome name={icon} size={40} color="#9CA3AF" />}
      <VStack space="sm" className="items-center">
        <Text className="text-typography-900 text-lg font-semibold">
          {title}
        </Text>
        {description && (
          <Text className="text-typography-500 text-center">{description}</Text>
        )}
      </VStack>
      {actionLabel && onAction && (
        <Button onPress={onAction} className="bg-primary-600 px-4">
          <ButtonText className="text-white font-medium">
            {actionLabel}
          </ButtonText>
        </Button>
      )}
    </VStack>
  );
};
