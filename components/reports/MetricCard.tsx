import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Text } from "react-native";
import { View } from "react-native";

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
    <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex-1 mx-1 min-w-[160px]">
      <View className="flex-row items-center justify-between mb-2">
        <View
          className={`w-10 h-10 rounded-lg items-center justify-center ${color}`}
        >
          <FontAwesome name={icon as any} size={20} color="white" />
        </View>
      </View>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-sm text-gray-600">{title}</Text>
      {subtitle && (
        <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>
      )}
    </View>
  )
);
