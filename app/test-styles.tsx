import React from "react";
import { View, Text } from "react-native";

export default function TestStyles() {
  return (
    <View className="flex-1 bg-red-500 justify-center items-center">
      <Text className="text-white text-2xl font-bold">NativeWind Test</Text>
      <View className="bg-blue-500 p-4 m-4 rounded-lg">
        <Text className="text-white">This should be blue background</Text>
      </View>
      <View className="bg-green-500 p-4 m-4 rounded-lg">
        <Text className="text-white">This should be green background</Text>
      </View>
    </View>
  );
}
