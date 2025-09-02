import React from "react";
import { RefreshControl } from "react-native";
import { ScrollView } from "react-native";
import { VStack, HStack } from "@/components/DesignSystem";
import { SafeAreaView } from "react-native-safe-area-context";

interface StandardPageProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  showScrollIndicators?: boolean;
  backgroundColor?: string;
  padding?: "none" | "sm" | "md" | "lg";
  contentPadding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
};

const contentPaddingMap = {
  none: "",
  sm: "px-2",
  md: "px-4",
  lg: "px-6",
};

export const StandardPage: React.FC<StandardPageProps> = ({
  children,
  refreshing = false,
  onRefresh,
  showScrollIndicators = false,
  backgroundColor = "bg-background-50",
  padding = "none",
  contentPadding = "md",
}) => {
  return (
    <SafeAreaView className={`flex-1 ${backgroundColor}`}>
      <ScrollView
        className={`flex-1 ${paddingMap[padding]}`}
        showsVerticalScrollIndicator={showScrollIndicators}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <VStack space="lg" className={contentPaddingMap[contentPadding]}>
          {children}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
};
