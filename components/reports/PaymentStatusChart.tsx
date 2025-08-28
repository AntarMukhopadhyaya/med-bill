import { SalesData } from "@/types/reports";
import React from "react";
import { Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
export const PaymentStatusChart = React.memo(
  ({ data }: { data: SalesData }) => {
    const pieData = [
      {
        value: data.paymentStatus.paid,
        color: "#4CAF50",
        gradientCenterColor: "#4CAF50",
        text: `Paid (${data.paymentStatus.paid})`,
      },
      {
        value: data.paymentStatus.pending,
        color: "#FF9800",
        gradientCenterColor: "#FF9800",
        text: `Pending (${data.paymentStatus.pending})`,
      },
      {
        value: data.paymentStatus.overdue,
        color: "#F44336",
        gradientCenterColor: "#F44336",
        text: `Overdue (${data.paymentStatus.overdue})`,
      },
    ].filter((item) => item.value > 0);

    // If no data to show, display a message
    if (pieData.length === 0) {
      return (
        <View className="items-center mt-4 py-8">
          <Text className="text-gray-500 text-center">
            No payment data available
          </Text>
        </View>
      );
    }

    return (
      <View className="items-center mt-4">
        <PieChart
          data={pieData}
          donut
          showText
          textColor="black"
          radius={80}
          textSize={12}
          focusOnPress
          showValuesAsLabels
          showTextBackground
          textBackgroundRadius={12}
          centerLabelComponent={() => (
            <Text className="text-lg font-bold">Payments</Text>
          )}
        />
      </View>
    );
  }
);
