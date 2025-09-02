import React from "react";
import { VStack, HStack, Text } from "@gluestack-ui/themed";

export const SectionCard = React.memo(
  ({
    title,
    children,
    action,
  }: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <VStack className="bg-background-0 rounded-lg p-6 mb-4 shadow-sm border border-outline-200">
      <HStack className="justify-between items-center mb-4">
        <Text className="text-lg font-semibold text-typography-900">
          {title}
        </Text>
        {action}
      </HStack>
      {children}
    </VStack>
  )
);
