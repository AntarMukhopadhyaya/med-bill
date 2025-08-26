import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  FlatList,
  Animated,
  Switch,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SafeScreen } from "@/components/DesignSystem";
import { Database } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";

type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"];
type InventoryInsert = Database["public"]["Tables"]["inventory"]["Insert"];
type InventoryUpdate = Database["public"]["Tables"]["inventory"]["Update"];
type InventoryLog = Database["public"]["Tables"]["inventory_logs"]["Row"];
type LowStockAlert = Database["public"]["Tables"]["low_stock_alerts"]["Row"];

interface InventoryWithAlerts extends InventoryItem {
  low_stock_alerts?: LowStockAlert[];
}

export default function InventoryManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<
    "name" | "quantity" | "price" | "updated_at"
  >("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // Enhanced query with caching and stale time
  const {
    data: inventoryItems = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["inventory", sortBy, sortOrder],
    queryFn: async (): Promise<InventoryWithAlerts[]> => {
      const { data, error } = await supabase
        .from("inventory")
        .select(
          `
          *,
          low_stock_alerts (*)
        `
        )
        .order(sortBy, { ascending: sortOrder === "asc" });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  });

  // Low stock alerts query
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("low_stock_alerts")
        .select(
          `
          *,
          inventory (name, quantity)
        `
        )
        .eq("alert_status", "active");

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Inventory logs query for selected item
  const { data: inventoryLogs = [] } = useQuery({
    queryKey: ["inventory-logs", selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem?.id) return [];
      const { data, error } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("item_id", selectedItem.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedItem?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Helper function to log inventory changes
  const logInventoryChange = async (
    itemId: string,
    quantityChanged: number,
    changeType: string,
    description: string
  ) => {
    try {
      await supabase.from("inventory_logs").insert({
        item_id: itemId,
        quantity_changed: quantityChanged,
        change_type: changeType,
        description,
        created_by: user?.id,
      } as any);
    } catch (error) {
      console.error("Failed to log inventory change:", error);
    }
  };

  const addItemMutation = useMutation({
    mutationFn: async (item: InventoryInsert) => {
      const { data, error } = await supabase
        .from("inventory")
        .insert({
          ...item,
          user_id: user?.id,
          updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] });
      const previousInventory = queryClient.getQueryData([
        "inventory",
        sortBy,
        sortOrder,
      ]);

      queryClient.setQueryData(["inventory", sortBy, sortOrder], (old: any) => {
        if (!old) return old;
        const optimisticItem = {
          id: `temp-${Date.now()}`,
          ...newItem,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user?.id,
        };
        return [optimisticItem, ...old];
      });

      return { previousInventory };
    },
    onError: (err, newItem, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(
          ["inventory", sortBy, sortOrder],
          context.previousInventory
        );
      }
      Alert.alert("Error", "Failed to add item. Please try again.");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      setIsAddModalVisible(false);
      logInventoryChange(
        (data as any).id,
        (data as any).quantity,
        "initial_stock",
        "Initial stock added"
      );
      Alert.alert("Success", "Item added successfully");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: InventoryUpdate;
    }) => {
      const { data, error } = await (supabase as any)
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
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] });
      const previousInventory = queryClient.getQueryData([
        "inventory",
        sortBy,
        sortOrder,
      ]);

      queryClient.setQueryData(["inventory", sortBy, sortOrder], (old: any) => {
        if (!old) return old;
        return old.map((item: any) =>
          item.id === id
            ? { ...item, ...updates, updated_at: new Date().toISOString() }
            : item
        );
      });

      return { previousInventory };
    },
    onError: (err, variables, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(
          ["inventory", sortBy, sortOrder],
          context.previousInventory
        );
      }
      Alert.alert("Error", "Failed to update item. Please try again.");
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({
        queryKey: ["inventory-logs", (data as any).id],
      });
      setIsEditModalVisible(false);
      setSelectedItem(null);

      const oldItem = inventoryItems.find((item) => item.id === variables.id);
      if (oldItem && oldItem.quantity !== (data as any).quantity) {
        const quantityChange = (data as any).quantity - oldItem.quantity;
        logInventoryChange(
          (data as any).id,
          quantityChange,
          quantityChange > 0 ? "restock" : "adjustment",
          `Quantity ${quantityChange > 0 ? "increased" : "decreased"} by ${Math.abs(quantityChange)}`
        );
      }

      Alert.alert("Success", "Item updated successfully");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["inventory"] });
      const previousInventory = queryClient.getQueryData([
        "inventory",
        sortBy,
        sortOrder,
      ]);

      queryClient.setQueryData(["inventory", sortBy, sortOrder], (old: any) => {
        if (!old) return old;
        return old.filter((item: any) => item.id !== id);
      });

      return { previousInventory };
    },
    onError: (err, id, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(
          ["inventory", sortBy, sortOrder],
          context.previousInventory
        );
      }
      Alert.alert("Error", "Failed to delete item. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      Alert.alert("Success", "Item deleted successfully");
    },
  });

  // Bulk operations
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: {
      ids: string[];
      data: Partial<InventoryUpdate>;
    }) => {
      const { data, error } = await (supabase as any)
        .from("inventory")
        .update({
          ...updates.data,
          updated_at: new Date().toISOString(),
        })
        .in("id", updates.ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      setIsBulkModalVisible(false);
      Alert.alert("Success", "Items updated successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to update items. Please try again.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("inventory").delete().in("id", ids);

      if (error) throw error;
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      Alert.alert("Success", "Items deleted successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete items. Please try again.");
    },
  });

  // Filtered and sorted inventory items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = inventoryItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hsn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === "all" ||
        (filterCategory === "low_stock" && item.quantity < 10) ||
        (filterCategory === "out_of_stock" && item.quantity === 0) ||
        (filterCategory === "in_stock" && item.quantity > 0);

      return matchesSearch && matchesCategory;
    });

    return filtered;
  }, [inventoryItems, searchQuery, filterCategory]);

  const handleItemPress = (item: InventoryItem) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedItems(newSelected);
    } else {
      setSelectedItem(item);
      setIsViewModalVisible(true);
    }
  };

  const handleLongPress = (item: InventoryItem) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedItems(new Set([item.id]));
    }
  };

  const handleDeleteItem = (item: InventoryItem) => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItemMutation.mutate(item.id),
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    Alert.alert(
      "Delete Items",
      `Are you sure you want to delete ${selectedItems.size} items? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => bulkDeleteMutation.mutate(Array.from(selectedItems)),
        },
      ]
    );
  };

  const getStockStatusColor = (quantity: number) => {
    if (quantity === 0) return "bg-red-500";
    if (quantity < 10) return "bg-orange-500";
    return "bg-green-500";
  };

  const getStockStatusText = (quantity: number) => {
    if (quantity === 0) return "Out of Stock";
    if (quantity < 10) return "Low Stock";
    return "In Stock";
  };

  const categories = [
    { key: "all", label: "All Items", icon: "cube" },
    { key: "in_stock", label: "In Stock", icon: "check-circle" },
    { key: "low_stock", label: "Low Stock", icon: "exclamation-triangle" },
    { key: "out_of_stock", label: "Out of Stock", icon: "times-circle" },
  ];

  const sortOptions = [
    { key: "updated_at", label: "Last Updated" },
    { key: "name", label: "Name" },
    { key: "quantity", label: "Quantity" },
    { key: "price", label: "Price" },
  ];

  const InventoryCard = ({ item }: { item: InventoryItem }) => {
    const isLowStock = item.quantity < 10;

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg font-semibold text-gray-900 flex-1">
                {item.name}
              </Text>
              {isLowStock && (
                <View className="bg-red-100 px-2 py-1 rounded-full">
                  <Text className="text-red-600 text-xs font-medium">
                    Low Stock
                  </Text>
                </View>
              )}
            </View>

            {item.description && (
              <Text className="text-sm text-gray-600 mb-2">
                {item.description}
              </Text>
            )}

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">
                Quantity: {item.quantity}
              </Text>
              <Text className="text-sm text-gray-600">
                Price: ₹{item.price}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-600">GST: {item.gst}%</Text>
              {item.hsn && (
                <Text className="text-sm text-gray-600">HSN: {item.hsn}</Text>
              )}
            </View>
          </View>

          <View className="flex-row ml-3">
            <TouchableOpacity
              onPress={() => {
                setSelectedItem(item);
                setIsEditModalVisible(true);
              }}
              className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2"
            >
              <FontAwesome name="edit" size={14} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteItem(item)}
              className="w-8 h-8 bg-red-100 rounded-full items-center justify-center"
            >
              <FontAwesome name="trash" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeScreen>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-gray-900">Inventory</Text>
            <TouchableOpacity
              onPress={() => setIsAddModalVisible(true)}
              className="bg-primary-500 px-4 py-2 rounded-lg flex-row items-center"
            >
              <FontAwesome name="plus" size={16} color="white" />
              <Text className="text-white font-medium ml-2">Add Item</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="relative">
            <FontAwesome
              name="search"
              size={16}
              color="#9CA3AF"
              style={{ position: "absolute", left: 12, top: 12, zIndex: 1 }}
            />
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-3"
              placeholder="Search inventory..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Inventory List */}
        <ScrollView
          className="flex-1 p-6"
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {isLoading ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <Text className="text-gray-500">Loading inventory...</Text>
            </View>
          ) : filteredAndSortedItems.length === 0 ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <FontAwesome name="cube" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4">No items found</Text>
              <Text className="text-gray-400 text-center mt-2">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first inventory item to get started"}
              </Text>
            </View>
          ) : (
            filteredAndSortedItems.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))
          )}
        </ScrollView>

        {/* Add/Edit Item Modal */}
        <InventoryModal
          visible={isAddModalVisible || isEditModalVisible}
          item={selectedItem}
          onClose={() => {
            setIsAddModalVisible(false);
            setIsEditModalVisible(false);
            setSelectedItem(null);
          }}
          onSave={(item) => {
            if (selectedItem) {
              updateItemMutation.mutate({ id: selectedItem.id, updates: item });
            } else {
              addItemMutation.mutate(item);
            }
          }}
          isLoading={addItemMutation.isPending || updateItemMutation.isPending}
        />
      </View>
    </SafeScreen>
  );
}

interface InventoryModalProps {
  visible: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryInsert) => void;
  isLoading: boolean;
}

function InventoryModal({
  visible,
  item,
  onClose,
  onSave,
  isLoading,
}: InventoryModalProps) {
  const [formData, setFormData] = useState<InventoryInsert>({
    name: "",
    quantity: 0,
    price: 0,
    gst: 18,
    hsn: "",
    description: "",
  });

  React.useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        gst: item.gst,
        hsn: item.hsn || "",
        description: item.description || "",
      });
    } else {
      setFormData({
        name: "",
        quantity: 0,
        price: 0,
        gst: 18,
        hsn: "",
        description: "",
      });
    }
  }, [item, visible]);

  const handleSave = () => {
    if (!formData.name) {
      Alert.alert("Error", "Item name is required");
      return;
    }
    if ((formData.price || 0) <= 0) {
      Alert.alert("Error", "Price must be greater than 0");
      return;
    }
    onSave(formData);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white">
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-bold text-gray-900">
              {item ? "Edit Item" : "Add Item"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-6">
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Item Name *
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                placeholder="Enter item name"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Description
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                placeholder="Enter item description"
                value={formData.description || ""}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={3}
              />
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </Text>
                <TextInput
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                  placeholder="0"
                  value={(formData.quantity || 0).toString()}
                  onChangeText={(text) =>
                    setFormData({ ...formData, quantity: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Price (₹) *
                </Text>
                <TextInput
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                  placeholder="0.00"
                  value={(formData.price || 0).toString()}
                  onChangeText={(text) =>
                    setFormData({ ...formData, price: parseFloat(text) || 0 })
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  GST (%)
                </Text>
                <TextInput
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                  placeholder="18"
                  value={(formData.gst || 0).toString()}
                  onChangeText={(text) =>
                    setFormData({ ...formData, gst: parseFloat(text) || 0 })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  HSN Code
                </Text>
                <TextInput
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                  placeholder="HSN Code"
                  value={formData.hsn || ""}
                  onChangeText={(text) =>
                    setFormData({ ...formData, hsn: text })
                  }
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View className="p-6 border-t border-gray-200">
          <TouchableOpacity
            className={`w-full py-3 rounded-lg items-center ${
              isLoading ? "bg-gray-400" : "bg-primary-500"
            }`}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text className="text-white font-semibold text-lg">
              {isLoading ? "Saving..." : "Save Item"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
