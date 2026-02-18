import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import {
  InventoryItem,
  InventoryWithAlerts,
  Category,
  SortOption,
} from "@/types/inventory";

import LoadingSpinner from "@/components/LoadingSpinner";
import { StandardPage, StandardHeader } from "@/components/layout";
import { InventoryList } from "@/components/inventory/InventoryList";
import { InventoryFilters } from "@/components/inventory/InventoryFilter";
import { InventoryModal } from "@/components/inventory/InventoryModal";
import { useToastHelpers } from "@/lib/toast";
import { router } from "expo-router";
import { useInfiniteInventory } from "@/hooks/useInfiniteInventory";
import { useInventoryMutations } from "@/hooks/useInventory";

export default function InventoryManagement() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToastHelpers();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<
    "name" | "quantity" | "price" | "updated_at"
  >("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch inventory items
  const {
    data,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteInventory({ sortBy, sortOrder });

  const inventoryItems: InventoryWithAlerts[] = useMemo(
    () => (data?.pages.flat() ?? []) as InventoryWithAlerts[],
    [data],
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.hsn?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.description
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === "all" ||
        (filterCategory === "low_stock" && item.quantity < 10) ||
        (filterCategory === "out_of_stock" && item.quantity === 0) ||
        (filterCategory === "in_stock" && item.quantity > 0);

      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, debouncedSearchQuery, filterCategory]);

  // Categories and sort options
  const categories = useMemo<Category[]>(
    () => [
      { key: "all", label: "All Items", icon: "cube" },
      { key: "in_stock", label: "In Stock", icon: "check-circle" },
      { key: "low_stock", label: "Low Stock", icon: "exclamation-triangle" },
      { key: "out_of_stock", label: "Out of Stock", icon: "times-circle" },
    ],
    [],
  );

  const sortOptions = useMemo<SortOption[]>(
    () => [
      { key: "updated_at", label: "Last Updated" },
      { key: "name", label: "Name" },
      { key: "quantity", label: "Quantity" },
      { key: "price", label: "Price" },
    ],
    [],
  );

  // Mutations
  const { addItemMutation, updateItemMutation, deleteItemMutation } =
    useInventoryMutations();

  // Handlers
  const handleCreateItem = useCallback(() => {
    setIsAddModalVisible(true);
  }, []);

  const handleEditItem = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditModalVisible(true);
  }, []);

  const handleDeleteItem = useCallback(
    (item: InventoryItem) => {
      Alert.alert(
        "Delete Item",
        `Are you sure you want to delete "${item.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () =>
              deleteItemMutation.mutate(item.id, {
                onSuccess: () => {
                  showSuccess("Success", "Item deleted successfully");
                },
                onError: (error) => {
                  console.error("Error deleting item:", error);
                  showError("Error", "Failed to delete item");
                },
              }),
          },
        ],
      );
    },
    [deleteItemMutation],
  );

  const handleItemPress = useCallback((item: InventoryItem) => {
    router.push(`/inventory/${item.id}`);
  }, []);

  const handleSaveItem = useCallback(
    (itemData: any) => {
      if (selectedItem) {
        updateItemMutation.mutate(
          { id: selectedItem.id, updates: itemData },
          {
            onSuccess: () => {
              setIsEditModalVisible(false);
              setSelectedItem(null);
              showSuccess("Success", "Item updated successfully");
            },
            onError: () => {
              showError("Error", "Failed to update item");
            },
          },
        );
      } else {
        addItemMutation.mutate(itemData, {
          onSuccess: () => {
            setIsAddModalVisible(false);
            showSuccess("Success", "Item added successfully");
          },
          onError: () => {
            showError("Error", "Failed to add item");
          },
        });
      }
    },
    [selectedItem, addItemMutation, updateItemMutation],
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterCategory("all");
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  if (isLoading && inventoryItems.length === 0) {
    return (
      <StandardPage>
        <StandardHeader
          title="Inventory"
          subtitle="Manage your inventory items"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showAddButton={true}
          onAddPress={handleCreateItem}
          showFiltersButton={true}
          onFiltersPress={toggleFilters}
        />
        <LoadingSpinner size="large" message="Loading inventory..." />
      </StandardPage>
    );
  }

  return (
    <StandardPage refreshing={isRefetching} onRefresh={refetch}>
      <StandardHeader
        title="Inventory"
        subtitle={`${filteredItems.length} items`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showAddButton={true}
        onAddPress={handleCreateItem}
        showFiltersButton={true}
        onFiltersPress={toggleFilters}
      />

      <InventoryFilters
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        categories={categories}
        sortOptions={sortOptions}
        showFilters={showFilters}
      />

      <InventoryList
        items={filteredItems}
        isRefetching={isRefetching}
        refetch={refetch}
        onItemPress={handleItemPress}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        searchQuery={searchQuery}
        filterCategory={filterCategory}
        isLoading={isLoading}
        onCreateItem={handleCreateItem}
        onClearFilters={handleClearFilters}
        onLoadMore={() => {
          if (hasNextPage) fetchNextPage();
        }}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />

      <InventoryModal
        visible={isAddModalVisible || isEditModalVisible}
        item={selectedItem}
        onClose={() => {
          setIsAddModalVisible(false);
          setIsEditModalVisible(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveItem}
        isLoading={addItemMutation.isPending || updateItemMutation.isPending}
      />
    </StandardPage>
  );
}
