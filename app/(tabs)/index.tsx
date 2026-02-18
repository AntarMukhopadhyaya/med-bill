import React from "react";
import { Alert, Pressable, View, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboard";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { StandardPage, StandardHeader } from "@/components/layout";
import { Badge, BadgeText } from "@/components/ui/badge";
import { StatsCard } from "@/components/reports/StatsCard";

// Quick Action Card Component
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  color?: "primary" | "success" | "warning" | "error";
  onPress?: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  color = "primary",
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="active:opacity-80"
    >
      <Card variant="elevated" className="p-4">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-background-100 rounded-xl items-center justify-center mr-4">
            {/* FontAwesome doesn't accept className for color, so we rely on semantic variant mapping later if needed */}
            <FontAwesome
              name={icon}
              size={24}
              // Using currentColor pattern via explicit mapping is not supported, keep size & rely on theme tokens later if wrapper provides it
              color={undefined}
            />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-typography-900 mb-1">
              {title}
            </Text>
            <Text className="text-sm text-typography-600">{description}</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} />
        </View>
      </Card>
    </Pressable>
  );
};

// Status Row Component
interface StatusRowProps {
  label: string;
  status: "online" | "offline" | "warning";
  icon: React.ComponentProps<typeof FontAwesome>["name"];
}

const StatusRow: React.FC<StatusRowProps> = ({ label, status, icon }) => {
  const statusConfig = {
    online: { text: "Online", badge: "success" as const },
    offline: { text: "Offline", badge: "error" as const },
    warning: { text: "Warning", badge: "warning" as const },
  };
  const config = statusConfig[status];
  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-row items-center flex-1">
        <FontAwesome name={icon} size={16} />
        <Text className="ml-3 text-base text-typography-700">{label}</Text>
      </View>
      <Badge variant={config.badge}>
        <BadgeText>{config.text}</BadgeText>
      </Badge>
    </View>
  );
};

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const { data: stats, isLoading, refetch, isRefetching } = useDashboardStats();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <StandardPage refreshing={isRefetching} onRefresh={refetch}>
      <StandardHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.email || "User"}`}
        showAddButton={false}
        additionalActions={
          <Pressable
            onPress={handleSignOut}
            className="bg-background-50 dark:bg-background-100 p-2 rounded-md min-w-9 min-h-9 items-center justify-center active:opacity-80"
          >
            <FontAwesome name="sign-out" size={16} />
          </Pressable>
        }
      />

      {/* Key Metrics */}
      <View className="mb-8">
        <Text className="text-xl font-bold text-typography-900 mb-4">
          Key Metrics
        </Text>

        {isLoading ? (
          <EmptyState
            icon="spinner"
            title="Loading Dashboard"
            description="Fetching your latest business metrics..."
          />
        ) : (
          <View className="gap-4">
            <View className="flex-row flex-wrap gap-4">
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Total Customers"
                  value={stats?.totalCustomers || 0}
                  icon="users"
                  color="primary"
                />
              </View>
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Total Orders"
                  value={stats?.totalOrders || 0}
                  icon="shopping-cart"
                  color="success"
                />
              </View>
            </View>

            <View className="flex-row flex-wrap gap-4">
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Total Revenue"
                  value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                  icon="line-chart"
                  color="success"
                />
              </View>
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Pending Orders"
                  value={stats?.pendingOrders || 0}
                  icon="clock-o"
                  color="warning"
                />
              </View>
            </View>

            <View className="flex-row flex-wrap gap-4">
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Low Stock Items"
                  value={stats?.lowStockItems || 0}
                  icon="exclamation-triangle"
                  color="error"
                />
              </View>
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Unpaid Invoices"
                  value={stats?.unpaidInvoices || 0}
                  icon="file-text"
                  color="warning"
                />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View className="mb-8">
        <Text className="text-xl font-bold text-typography-900 mb-4">
          Quick Actions
        </Text>

        <View className="gap-3">
          <QuickActionCard
            title="Add New Customer"
            description="Register a new customer in the system"
            icon="user-plus"
            color="primary"
            onPress={() => router.push("/customers/create")}
          />
          <QuickActionCard
            title="Create Order"
            description="Process a new customer order"
            icon="plus-circle"
            color="success"
            onPress={() => router.push("/orders/create")}
          />
          <QuickActionCard
            title="Generate Invoice"
            description="Create invoice for completed orders"
            icon="file-text-o"
            color="warning"
            onPress={() => router.push("/invoices/create")}
          />

          <QuickActionCard
            title="Update Inventory"
            description="Manage your product inventory"
            icon="cube"
            color="primary"
            onPress={() => router.push("/inventory")}
          />

          <QuickActionCard
            title="Store Settings"
            description="Configure your store details and branding"
            icon="cog"
            color="primary"
            onPress={() => {
              console.log("Store Settings pressed");
              router.push("/store");
            }}
          />
        </View>
      </View>
    </StandardPage>
  );
}
