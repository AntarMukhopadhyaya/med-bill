import React from "react";
import { Alert, Pressable, View, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatsCard, Card, EmptyState, Badge } from "@/components/DesignSystem";
import { StandardPage, StandardHeader } from "@/components/layout";
import { useLedgerSummary } from "@/hooks/useLedgerSummary";
import { useAgingAnalysis } from "@/hooks/useAgingAnalysis";
import { BadgeText } from "@/components/ui/badge";

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
  const iconColorClass: Record<string, string> = {
    primary: "text-primary-500",
    success: "text-success-500",
    warning: "text-warning-500",
    error: "text-error-500",
  };
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

  const {
    data: stats,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
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

  const { data: ledgerSummary, isLoading: ledgerLoading } = useLedgerSummary();
  const { data: agingRows, isLoading: agingLoading } = useAgingAnalysis();

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

      {/* Financial Overview */}
      <View className="mb-8">
        <Text className="text-xl font-bold text-typography-900 mb-4">
          Financial Overview
        </Text>
        {ledgerLoading ? (
          <View className="gap-3">
            <View className="flex-row gap-4">
              <View className="flex-1 min-w-40 h-24 bg-background-100 rounded-lg" />
              <View className="flex-1 min-w-40 h-24 bg-background-100 rounded-lg" />
            </View>
            <View className="flex-row gap-4">
              <View className="flex-1 min-w-40 h-24 bg-background-100 rounded-lg" />
              <View className="flex-1 min-w-40 h-24 bg-background-100 rounded-lg" />
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-4">
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Receivables"
                  value={`₹${(
                    ledgerSummary?.total_outstanding_receivables || 0
                  ).toLocaleString()}`}
                  icon="arrow-circle-up"
                  color="warning"
                />
              </View>
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Payables"
                  value={`₹${(
                    ledgerSummary?.total_outstanding_payables || 0
                  ).toLocaleString()}`}
                  icon="arrow-circle-down"
                  color="error"
                />
              </View>
            </View>
            <View className="flex-row flex-wrap gap-4 mt-4">
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Net Position"
                  value={`₹${(
                    ledgerSummary?.net_position || 0
                  ).toLocaleString()}`}
                  icon="balance-scale"
                  color="primary"
                />
              </View>
              <View className="flex-1 min-w-40">
                <StatsCard
                  title="Positive Balances"
                  value={ledgerSummary?.customers_with_positive_balance || 0}
                  icon="smile-o"
                  color="success"
                />
              </View>
            </View>
          </>
        )}
        {/* Aging mini-table */}
        {agingLoading ? (
          <View className="mt-5 gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} className="h-8 bg-background-100 rounded-md" />
            ))}
          </View>
        ) : (
          agingRows &&
          agingRows.length > 0 && (
            <View className="mt-5 bg-background-0 border border-outline-200 rounded-lg p-4">
              <Text className="text-base font-semibold mb-3 text-typography-900">
                Top Aging (Tap Row)
              </Text>
              {agingRows.slice(0, 5).map((r) => (
                <Pressable
                  key={r.customer_id}
                  onPress={() =>
                    router.push(`/customers/${r.customer_id}` as any)
                  }
                  className="active:opacity-80"
                >
                  <View className="flex-row justify-between py-1 border-b border-outline-100">
                    <Text
                      className="flex-1 text-typography-700"
                      numberOfLines={1}
                    >
                      {r.customer_name}
                    </Text>
                    <Text className="w-[70px] text-right text-xs text-typography-600">
                      {(r.days_0_30 || 0).toLocaleString()}
                    </Text>
                    <Text className="w-[70px] text-right text-xs text-typography-600">
                      {(r.days_31_60 || 0).toLocaleString()}
                    </Text>
                    <Text className="w-[70px] text-right text-xs text-typography-600">
                      {(r.days_61_90 || 0).toLocaleString()}
                    </Text>
                    <Text className="w-[70px] text-right text-xs text-typography-600">
                      {(r.days_over_90 || 0).toLocaleString()}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <View className="flex-row justify-end mt-2">
                <Text className="text-[10px] text-typography-500">
                  0-30 | 31-60 | 61-90 | 90+
                </Text>
              </View>
            </View>
          )
        )}
      </View>
    </StandardPage>
  );
}
