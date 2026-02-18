import React from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  rightElement,
}) => {
  return (
    <HStack className="items-center justify-between mb-4">
      <VStack className="flex-1">
        <Text className="text-lg font-bold text-typography-900">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-typography-600 mt-1">{subtitle}</Text>
        )}
      </VStack>
      {rightElement}
    </HStack>
  );
};
