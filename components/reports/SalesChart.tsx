import { SalesData } from "@/types/reports";
import React from "react";
import { View, Text } from "react-native";
import { BarChart } from "react-native-gifted-charts";

export const SalesChart = React.memo(({ data }: { data: SalesData }) => {
  // Handle empty data case
  if (!data.salesByMonth || data.salesByMonth.length === 0) {
    return (
      <View className="h-64 mt-4 items-center justify-center">
        <Text className="text-gray-500 text-center">
          No sales data available for this period
        </Text>
      </View>
    );
  }

  const chartData = data.salesByMonth.map((month, index) => ({
    value: month.sales,
    label: month.month,
    frontColor: index === data.salesByMonth.length - 1 ? "#177AD5" : "#ADD8E6",
  }));

  // Handle empty data case
  const maxSales =
    data.salesByMonth.length > 0
      ? Math.max(...data.salesByMonth.map((m) => m.sales))
      : 100; // Default max value when no data

  return (
    <View className="h-64 mt-4">
      <BarChart
        data={chartData}
        barWidth={22}
        spacing={24}
        roundedTop
        roundedBottom
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: "gray" }}
        noOfSections={4}
        maxValue={maxSales * 1.2}
        showFractionalValues
        showYAxisIndices
        showXAxisIndices
        animationDuration={1000}
      />
    </View>
  );
});
