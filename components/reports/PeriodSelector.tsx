import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { ScrollView, View } from "react-native";

export const PeriodSelector = React.memo(
  ({
    selectedPeriod,
    setSelectedPeriod,
  }: {
    selectedPeriod: string;
    setSelectedPeriod: (period: string) => void;
  }) => {
    const periods = [
      { key: "week", label: "This Week" },
      { key: "month", label: "This Month" },
      { key: "quarter", label: "This Quarter" },
      { key: "year", label: "This Year" },
    ];

    return (
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              onPress={() => setSelectedPeriod(period.key)}
              className={`mr-3 px-4 py-2 rounded-lg ${
                selectedPeriod === period.key ? "bg-primary-500" : "bg-gray-100"
              }`}
            >
              <Text
                className={`font-medium ${
                  selectedPeriod === period.key ? "text-white" : "text-gray-700"
                }`}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
);
