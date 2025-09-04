import React from "react";
import { ScrollView } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Category, SortOption } from "@/types/inventory";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "../ui/pressable";

interface InventoryFiltersProps {
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  sortBy: "name" | "quantity" | "price" | "updated_at";
  setSortBy: (sort: "name" | "quantity" | "price" | "updated_at") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  categories: Category[];
  sortOptions: SortOption[];
  showFilters: boolean;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filterCategory,
  setFilterCategory,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  categories,
  sortOptions,
  showFilters,
}) => {
  if (!showFilters) return null;

  return (
    <VStack className="p-6 pb-4">
      {/* Category Filters */}
      <VStack className="mb-4">
        <Text className="text-sm font-medium text-typography-700 mb-2">
          Filter by Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HStack className="gap-3">
            {categories.map((category) => (
              <Pressable
                key={category.key}
                onPress={() => setFilterCategory(category.key)}
                className={`px-4 py-2 rounded-lg border flex-row items-center ${
                  filterCategory === category.key
                    ? "bg-primary-500 border-primary-500"
                    : "bg-background-0 border-outline-300"
                }`}
              >
                <FontAwesome
                  name={category.icon}
                  size={14}
                  color={
                    filterCategory === category.key
                      ? "rgb(var(--color-background-0))"
                      : "rgb(var(--color-typography-600))"
                  }
                />
                <Text
                  className={`ml-2 font-medium ${
                    filterCategory === category.key
                      ? "text-background-0"
                      : "text-typography-700"
                  }`}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </ScrollView>
      </VStack>

      {/* Sort Options */}
      <VStack>
        <Text className="text-sm font-medium text-typography-700 mb-2">
          Sort by
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HStack className="gap-3">
            {sortOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => {
                  if (sortBy === option.key) {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy(option.key);
                    setSortOrder("desc");
                  }
                }}
                className={`px-4 py-2 rounded-lg border flex-row items-center ${
                  sortBy === option.key
                    ? "bg-primary-500 border-primary-500"
                    : "bg-background-0 border-outline-300"
                }`}
              >
                <Text
                  className={`font-medium mr-2 ${
                    sortBy === option.key
                      ? "text-background-0"
                      : "text-typography-700"
                  }`}
                >
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <FontAwesome
                    name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                    size={12}
                    color="rgb(var(--color-background-0))"
                  />
                )}
              </Pressable>
            ))}
          </HStack>
        </ScrollView>
      </VStack>
    </VStack>
  );
};
