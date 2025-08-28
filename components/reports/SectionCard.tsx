import React from "react";
import { Text, View } from "react-native";

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
    <View className="bg-white rounded-lg p-6 mb-4 shadow-sm border border-gray-200">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  )
);
