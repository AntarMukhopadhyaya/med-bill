import React, { useMemo } from "react";
import { TouchableOpacity, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchBar } from "@/components/SearchBar";
import { Ionicons } from "@expo/vector-icons";
import { Divider } from "../ui/divider";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";

interface StandardHeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  showAddButton?: boolean;
  onAddPress?: () => void;
  showFiltersButton?: boolean;
  onFiltersPress?: () => void;
  additionalActions?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const StandardHeader: React.FC<StandardHeaderProps> = ({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  showAddButton = false,
  onAddPress,
  showFiltersButton = false,
  onFiltersPress,
  additionalActions,
  showBackButton = false,
  onBack,
  rightElement,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Memoized container styles for stable background
  const containerStyle = useMemo(
    () => ({
      backgroundColor: "white",
      paddingTop: 16,
      paddingBottom: 16,
      paddingHorizontal: 24,
    }),
    []
  );

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      if (router.canGoBack()) {
        router.back();
      }
    }
  };

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="white"
        translucent={false}
      />

      <VStack className="gap-4" style={containerStyle}>
        {/* Title and Actions Row */}
        <HStack className="justify-between items-start gap-4">
          {/* Left Section - Back Button + Title */}
          <HStack className="flex-1 items-start gap-4">
            {showBackButton && (
              <TouchableOpacity
                onPress={handleBack}
                className="w-10 h-10 items-center justify-center -ml-2 mt-1"
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color="rgb(var(--color-typography-700))"
                />
              </TouchableOpacity>
            )}

            {/* Title Section */}
            <VStack className="flex-1 gap-1">
              <Heading size="2xl" className="text-typography-900 font-bold">
                {title}
              </Heading>
              {subtitle && (
                <Heading size="sm" className="text-typography-600 font-normal">
                  {subtitle}
                </Heading>
              )}
            </VStack>
          </HStack>

          {/* Right Section - Actions and Custom Element */}
          <HStack className="items-center gap-2">
            {/* Default Action Buttons */}
            {showFiltersButton && onFiltersPress && (
              <TouchableOpacity
                onPress={onFiltersPress}
                className="w-10 h-10 bg-background-100 rounded-full items-center justify-center"
                accessibilityLabel="Show filters"
                accessibilityRole="button"
              >
                <Ionicons
                  name="filter"
                  size={20}
                  color="rgb(var(--color-typography-600))"
                />
              </TouchableOpacity>
            )}

            {additionalActions}

            {showAddButton && onAddPress && (
              <TouchableOpacity
                onPress={onAddPress}
                className="w-10 h-10 bg-primary-500 rounded-full items-center justify-center shadow-md"
                accessibilityLabel="Add new item"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            )}

            {/* Custom Right Element */}
            {rightElement}
          </HStack>
        </HStack>

        {/* Search Bar */}
        {onSearchChange && (
          <SearchBar
            value={searchQuery || ""}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}
      </VStack>

      {/* Divider */}
      <Divider className="bg-outline-200" />
    </>
  );
};
