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
import { useLedgerSummary } from "@/hooks/useLedgerSummary";
import { useAgingAnalysis } from "@/hooks/useAgingAnalysis";
import { useMultiStepWorkflowModal } from "@/components/useMultiStepModal";

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

  const { data: ledgerSummary, isLoading: ledgerLoading } = useLedgerSummary();
  const { data: agingRows, isLoading: agingLoading } = useAgingAnalysis();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };
  const { open: openWorkflowModal, modal: workflowModal } =
    useMultiStepWorkflowModal();

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
              title="Worflow"
              description="Manage your product inventory"
              icon="cube"
              color="primary"
              onPress={() => openWorkflowModal()}
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
        <View style={{ marginBottom: spacing[8] }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.gray[900],
              marginBottom: spacing[4],
            }}
          >
            Financial Overview
          </Text>
          {ledgerLoading ? (
            <View style={{ gap: spacing[3] }}>
              <View style={{ flexDirection: "row", gap: spacing[4] }}>
                <View
                  style={{
                    flex: 1,
                    minWidth: 160,
                    height: 90,
                    backgroundColor: colors.gray[100],
                    borderRadius: 8,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    minWidth: 160,
                    height: 90,
                    backgroundColor: colors.gray[100],
                    borderRadius: 8,
                  }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: spacing[4] }}>
                <View
                  style={{
                    flex: 1,
                    minWidth: 160,
                    height: 90,
                    backgroundColor: colors.gray[100],
                    borderRadius: 8,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    minWidth: 160,
                    height: 90,
                    backgroundColor: colors.gray[100],
                    borderRadius: 8,
                  }}
                />
              </View>
            </View>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  gap: spacing[4],
                  flexWrap: "wrap",
                }}
              >
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Receivables"
                    value={`₹${(ledgerSummary?.total_outstanding_receivables || 0).toLocaleString()}`}
                    icon="arrow-circle-up"
                    color="warning"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Payables"
                    value={`₹${(ledgerSummary?.total_outstanding_payables || 0).toLocaleString()}`}
                    icon="arrow-circle-down"
                    color="error"
                  />
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: spacing[4],
                  flexWrap: "wrap",
                  marginTop: spacing[4],
                }}
              >
                <View style={{ flex: 1, minWidth: 160 }}>
                  <StatsCard
                    title="Net Position"
                    value={`₹${(ledgerSummary?.net_position || 0).toLocaleString()}`}
                    icon="balance-scale"
                    color="primary"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
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
            <View style={{ marginTop: spacing[5], gap: 6 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    height: 32,
                    backgroundColor: colors.gray[100],
                    borderRadius: 6,
                  }}
                />
              ))}
            </View>
          ) : (
            agingRows &&
            agingRows.length > 0 && (
              <View
                style={{
                  marginTop: spacing[5],
                  backgroundColor: colors.white,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.gray[200],
                  padding: spacing[4],
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    marginBottom: spacing[3],
                    color: colors.gray[900],
                  }}
                >
                  Top Aging (Tap Row)
                </Text>
                {agingRows.slice(0, 5).map((r) => (
                  <TouchableOpacity
                    key={r.customer_id}
                    onPress={() =>
                      router.push(`/customers/${r.customer_id}` as any)
                    }
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.gray[100],
                      }}
                    >
                      <Text
                        style={{ flex: 1, color: colors.gray[700] }}
                        numberOfLines={1}
                      >
                        {r.customer_name}
                      </Text>
                      <Text
                        style={{
                          width: 70,
                          textAlign: "right",
                          color: colors.gray[600],
                          fontSize: 12,
                        }}
                      >
                        {(r.days_0_30 || 0).toLocaleString()}
                      </Text>
                      <Text
                        style={{
                          width: 70,
                          textAlign: "right",
                          color: colors.gray[600],
                          fontSize: 12,
                        }}
                      >
                        {(r.days_31_60 || 0).toLocaleString()}
                      </Text>
                      <Text
                        style={{
                          width: 70,
                          textAlign: "right",
                          color: colors.gray[600],
                          fontSize: 12,
                        }}
                      >
                        {(r.days_61_90 || 0).toLocaleString()}
                      </Text>
                      <Text
                        style={{
                          width: 70,
                          textAlign: "right",
                          color: colors.gray[600],
                          fontSize: 12,
                        }}
                      >
                        {(r.days_over_90 || 0).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: spacing[2],
                  }}
                >
                  <Text style={{ fontSize: 10, color: colors.gray[500] }}>
                    0-30 | 31-60 | 61-90 | 90+
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>
      {workflowModal}
    </SafeScreen>
  );
}
