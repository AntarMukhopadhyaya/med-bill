import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { VStack, HStack, Text, Box } from "@gluestack-ui/themed";

// Components
export const MetricCard = React.memo(
  ({
    title,
    value,
    icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }) => (
    <VStack className="bg-background-0 rounded-lg p-4 shadow-sm border border-outline-200 flex-1 mx-1 min-w-[160px] mb-2">
      <Box className="mb-2">
        <Box
          className={`w-10 h-10 rounded-lg items-center justify-center ${color}`}
        >
          <FontAwesome name={icon as any} size={20} color="white" />
        </Box>
      </Box>
      <Text className="text-2xl font-bold text-typography-900">{value}</Text>
      <Text className="text-sm text-typography-600">{title}</Text>
      {subtitle && (
        <Text className="text-xs text-typography-500 mt-1">{subtitle}</Text>
      )}
    </VStack>
  )
);
