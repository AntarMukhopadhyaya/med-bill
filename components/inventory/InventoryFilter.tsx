import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Category, SortOption } from "@/types/inventory";
import { colors, spacing } from "@/components/DesignSystem";

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
    <View style={{ padding: spacing[6], paddingBottom: spacing[4] }}>
      {/* Category Filters */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.gray[700],
            marginBottom: spacing[2],
          }}
        >
          Filter by Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              onPress={() => setFilterCategory(category.key)}
              style={{
                marginRight: spacing[3],
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                borderRadius: 8,
                borderWidth: 1,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor:
                  filterCategory === category.key
                    ? colors.primary[500]
                    : colors.white,
                borderColor:
                  filterCategory === category.key
                    ? colors.primary[500]
                    : colors.gray[300],
              }}
            >
              <FontAwesome
                name={category.icon}
                size={14}
                color={
                  filterCategory === category.key
                    ? colors.white
                    : colors.gray[600]
                }
              />
              <Text
                style={{
                  marginLeft: spacing[2],
                  fontWeight: "500",
                  color:
                    filterCategory === category.key
                      ? colors.white
                      : colors.gray[700],
                }}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.gray[700],
            marginBottom: spacing[2],
          }}
        >
          Sort by
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => {
                if (sortBy === option.key) {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                } else {
                  setSortBy(option.key);
                  setSortOrder("desc");
                }
              }}
              style={{
                marginRight: spacing[3],
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                borderRadius: 8,
                borderWidth: 1,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor:
                  sortBy === option.key ? colors.primary[500] : colors.white,
                borderColor:
                  sortBy === option.key
                    ? colors.primary[500]
                    : colors.gray[300],
              }}
            >
              <Text
                style={{
                  fontWeight: "500",
                  color:
                    sortBy === option.key ? colors.white : colors.gray[700],
                  marginRight: spacing[2],
                }}
              >
                {option.label}
              </Text>
              {sortBy === option.key && (
                <FontAwesome
                  name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                  size={12}
                  color={colors.white}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};
