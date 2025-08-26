import React from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  StatsCard,
  Card,
  Button,
  colors,
  spacing,
  EmptyState,
  Badge,
  SafeScreen,
} from "@/components/DesignSystem";

interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
  unpaidInvoices: number;
}

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
  const colorConfig = {
    primary: colors.primary[500],
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card variant="elevated" padding={4}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              backgroundColor: colors.gray[100],
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              marginRight: spacing[4],
            }}
          >
            <FontAwesome name={icon} size={24} color={colorConfig[color]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.gray[900],
                marginBottom: spacing[1],
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.gray[600],
              }}
            >
              {description}
            </Text>
          </View>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={colors.gray[400]}
          />
        </View>
      </Card>
    </TouchableOpacity>
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
    online: {
      color: colors.success[500],
      text: "Online",
      badge: "success" as const,
    },
    offline: {
      color: colors.error[500],
      text: "Offline",
      badge: "error" as const,
    },
    warning: {
      color: colors.warning[500],
      text: "Warning",
      badge: "warning" as const,
    },
  };

  const config = statusConfig[status];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing[2],
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <FontAwesome
          name={icon}
          size={16}
          color={config.color}
          style={{ marginRight: spacing[3] }}
        />
        <Text
          style={{
            fontSize: 16,
            color: colors.gray[700],
          }}
        >
          {label}
        </Text>
      </View>
      <Badge label={config.text} variant={config.badge} />
    </View>
  );
};

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [
        customersResult,
        ordersResult,
        revenueResult,
        pendingOrdersResult,
        lowStockResult,
        unpaidInvoicesResult,
      ] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact" }),
        supabase.from("orders").select("id", { count: "exact" }),
        supabase.from("orders").select("total_amount"),
        supabase
          .from("orders")
          .select("id", { count: "exact" })
          .eq("order_status", "pending"),
        supabase
          .from("inventory")
          .select("id", { count: "exact" })
          .lt("quantity", 10),
        supabase
          .from("invoices")
          .select("id", { count: "exact" })
          .neq("status", "paid"),
      ]);

      const totalRevenue =
        revenueResult.data?.reduce(
          (sum: number, order: any) => sum + (order.total_amount || 0),
          0
        ) || 0;

      return {
        totalCustomers: customersResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        pendingOrders: pendingOrdersResult.count || 0,
        lowStockItems: lowStockResult.count || 0,
        unpaidInvoices: unpaidInvoicesResult.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <SafeScreen>
      <Header
        title="Dashboard"
        subtitle={`Welcome back, ${user?.email || "User"}`}
        rightElement={
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="ghost"
            icon="sign-out"
            size="sm"
          />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics */}
        <View style={{ marginBottom: spacing[8] }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Key Metrics
          </Text>

          {isLoading ? (
            <EmptyState
              icon="spinner"
              title="Loading Dashboard"
              description="Fetching your latest business metrics..."
            />
          ) : (
            <View style={{ gap: spacing[4] }}>
              <View
                style={{
                  flexDirection: "row",
                  gap: spacing[4],
                  flexWrap: "wrap",
                }}
              >
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Total Customers"
                    value={stats?.totalCustomers || 0}
                    icon="users"
                    color="primary"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Total Orders"
                    value={stats?.totalOrders || 0}
                    icon="shopping-cart"
                    color="success"
                  />
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: spacing[4],
                  flexWrap: "wrap",
                }}
              >
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Total Revenue"
                    value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                    icon="line-chart"
                    color="success"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Pending Orders"
                    value={stats?.pendingOrders || 0}
                    icon="clock-o"
                    color="warning"
                  />
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: spacing[4],
                  flexWrap: "wrap",
                }}
              >
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Low Stock Items"
                    value={stats?.lowStockItems || 0}
                    icon="exclamation-triangle"
                    color="error"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
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
        <View style={{ marginBottom: spacing[8] }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Quick Actions
          </Text>

          <View style={{ gap: spacing[3] }}>
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

        {/* System Status */}
        <View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            System Status
          </Text>

          <Card variant="elevated" padding={4}>
            <View style={{ gap: spacing[3] }}>
              <StatusRow
                label="Database Connection"
                status="online"
                icon="database"
              />
              <StatusRow
                label="Payment Gateway"
                status="online"
                icon="credit-card"
              />
              <StatusRow label="Backup System" status="online" icon="cloud" />
              <StatusRow
                label="Email Service"
                status="online"
                icon="envelope"
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
