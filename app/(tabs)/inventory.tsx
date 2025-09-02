import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  InventoryItem,
  InventoryWithAlerts,
  Category,
  SortOption,
} from "@/types/inventory";

import { LoadingSpinner } from "@/components/DesignSystem";
import { StandardPage, StandardHeader } from "@/components/layout";
import { InventoryList } from "@/components/inventory/InventoryList";
import { InventoryFilters } from "@/components/inventory/InventoryFilter";
import { InventoryModal } from "@/components/inventory/InventoryModal";
import { useToastHelpers } from "@/lib/toast";
import { router } from "expo-router";

export default function InventoryManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
    data: inventoryItems = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["inventory", sortBy, sortOrder],
    queryFn: async (): Promise<InventoryWithAlerts[]> => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*, low_stock_alerts (*)")
        .order(sortBy, { ascending: sortOrder === "asc" });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

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
    []
  );

  const sortOptions = useMemo<SortOption[]>(
    () => [
      { key: "updated_at", label: "Last Updated" },
      { key: "name", label: "Name" },
      { key: "quantity", label: "Quantity" },
      { key: "price", label: "Price" },
    ],
    []
  );

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase
        .from("inventory")
        .insert({
          ...item,
          user_id: user?.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsAddModalVisible(false);
      showSuccess("Success", "Item added successfully");
    },
    onError: () => {
      showError("Error", "Failed to add item");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("inventory")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsEditModalVisible(false);
      setSelectedItem(null);
      showSuccess("Success", "Item updated successfully");
    },
    onError: () => {
      showError("Error", "Failed to update item");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showSuccess("Success", "Item deleted successfully");
    },
    onError: () => {
      showError("Error", "Failed to delete item");
    },
  });

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
            onPress: () => deleteItemMutation.mutate(item.id),
          },
        ]
      );
    },
    [deleteItemMutation]
  );

  const handleItemPress = useCallback((item: InventoryItem) => {
    router.push(`/inventory/${item.id}`);
  }, []);

  const handleSaveItem = useCallback(
    (itemData: any) => {
      if (selectedItem) {
        updateItemMutation.mutate({ id: selectedItem.id, updates: itemData });
      } else {
        addItemMutation.mutate(itemData);
      }
    },
    [selectedItem, addItemMutation, updateItemMutation]
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
        <LoadingSpinner
          size="large"
          message="Loading inventory..."
          variant="default"
        />
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
