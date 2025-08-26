import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SafeScreen } from "@/components/DesignSystem";

interface SalesData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topCustomers: Array<{
    name: string;
    totalSpent: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
  paymentStatus: {
    paid: number;
    pending: number;
    overdue: number;
  };
}

interface DatabaseHealthMetrics {
  total_customers: number;
  total_orders: number;
  total_inventory_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_invoices: number;
  unpaid_invoices: number;
  total_revenue_this_month: number;
  last_updated: string;
}

interface InventoryTurnoverItem {
  item_id: string;
  item_name: string;
  opening_stock: number;
  closing_stock: number;
  total_sold: number;
  turnover_ratio: number;
  days_of_stock: number;
}

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: salesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sales-report", selectedPeriod],
    queryFn: async (): Promise<SalesData> => {
      // Get date range based on selected period
      const now = new Date();
      let startDate: Date;

      switch (selectedPeriod) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          startDate = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1
          );
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Get sales data
      const { data: orders } = await supabase
        .from("orders")
        .select(
          `
          *,
          customers (name),
          order_items (
            item_name,
            quantity,
            total_price
          )
        `
        )
        .gte("order_date", startDate.toISOString());

      // Calculate totals
      const totalSales =
        orders?.reduce(
          (sum: number, order: any) => sum + (order.total_amount || 0),
          0
        ) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Top customers
      const customerSales = new Map();
      orders?.forEach((order: any) => {
        const customerName = order.customers?.name || "Unknown";
        const existing = customerSales.get(customerName) || {
          totalSpent: 0,
          orderCount: 0,
        };
        customerSales.set(customerName, {
          totalSpent: existing.totalSpent + (order.total_amount || 0),
          orderCount: existing.orderCount + 1,
        });
      });

      const topCustomers = Array.from(customerSales.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      // Top products
      const productSales = new Map();
      orders?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const existing = productSales.get(item.item_name) || {
            quantitySold: 0,
            revenue: 0,
          };
          productSales.set(item.item_name, {
            quantitySold: existing.quantitySold + item.quantity,
            revenue: existing.revenue + (item.total_price || 0),
          });
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);

      // Sales by month (last 6 months)
      const salesByMonth: Array<{
        month: string;
        sales: number;
        orders: number;
      }> = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthOrders =
          orders?.filter((order: any) => {
            const orderDate = new Date(order.order_date);
            return orderDate >= monthStart && orderDate <= monthEnd;
          }) || [];

        salesByMonth.push({
          month: date.toLocaleDateString("en-US", { month: "short" }),
          sales: monthOrders.reduce(
            (sum: number, order: any) => sum + (order.total_amount || 0),
            0
          ),
          orders: monthOrders.length,
        });
      }

      // Payment status
      const paymentStatus = {
        paid:
          orders?.filter((order: any) => order.payment_status === "paid")
            .length || 0,
        pending:
          orders?.filter((order: any) => order.payment_status === "pending")
            .length || 0,
        overdue:
          orders?.filter((order: any) => order.payment_status === "overdue")
            .length || 0,
      };

      return {
        totalSales,
        totalOrders,
        averageOrderValue,
        topCustomers,
        topProducts,
        salesByMonth,
        paymentStatus,
      };
    },
  });

  // Database Health Metrics Query
  const { data: healthMetrics, isLoading: healthLoading } = useQuery({
    queryKey: ["database-health"],
    queryFn: async (): Promise<DatabaseHealthMetrics> => {
      const { data, error } = await supabase.rpc("get_database_health_metrics");
      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Inventory Turnover Query
  const { data: inventoryTurnover, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory-turnover", selectedPeriod],
    queryFn: async (): Promise<InventoryTurnoverItem[]> => {
      const now = new Date();
      let startDate: Date;

      switch (selectedPeriod) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          startDate = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1
          );
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data, error } = await supabase.rpc(
        "get_inventory_turnover_report",
        {
          start_date: startDate.toISOString(),
          end_date: now.toISOString(),
        } as any
      );
      if (error) throw error;
      return data || [];
    },
  });

  // Customer Balance Query
  const { data: customersWithBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ["customers-with-balance"],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc(
        "get_total_customers_with_balance"
      );
      if (error) throw error;
      return data || 0;
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      // The other queries will auto-refresh due to their cache keys
    ]);
    setRefreshing(false);
  };

  const periods = [
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "quarter", label: "This Quarter" },
    { key: "year", label: "This Year" },
  ];

  const MetricCard = ({
    title,
    value,
    icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }) => (
    <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex-1 mx-1">
      <View className="flex-row items-center justify-between mb-2">
        <View
          className={`w-10 h-10 rounded-lg items-center justify-center ${color}`}
        >
          <FontAwesome name={icon as any} size={20} color="white" />
        </View>
      </View>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-sm text-gray-600">{title}</Text>
      {subtitle && (
        <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>
      )}
    </View>
  );

  const SectionCard = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View className="bg-white rounded-lg p-6 mb-4 shadow-sm border border-gray-200">
      <Text className="text-lg font-semibold text-gray-900 mb-4">{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeScreen>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900 mb-4">
            Reports & Analytics
          </Text>

          {/* Period Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                onPress={() => setSelectedPeriod(period.key)}
                className={`mr-3 px-4 py-2 rounded-lg ${
                  selectedPeriod === period.key
                    ? "bg-primary-500"
                    : "bg-gray-100"
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedPeriod === period.key
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          className="flex-1 p-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {isLoading ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <Text className="text-gray-500">Loading reports...</Text>
            </View>
          ) : (
            <>
              {/* Key Metrics */}
              <View className="flex-row mb-4">
                <MetricCard
                  title="Total Sales"
                  value={`₹${salesData?.totalSales?.toLocaleString() || 0}`}
                  icon="money"
                  color="bg-green-500"
                />
                <MetricCard
                  title="Total Orders"
                  value={salesData?.totalOrders || 0}
                  icon="shopping-cart"
                  color="bg-blue-500"
                />
              </View>

              <View className="flex-row mb-6">
                <MetricCard
                  title="Avg Order Value"
                  value={`₹${salesData?.averageOrderValue?.toFixed(0) || 0}`}
                  icon="calculator"
                  color="bg-purple-500"
                />
                <MetricCard
                  title="Payment Pending"
                  value={salesData?.paymentStatus.pending || 0}
                  icon="clock-o"
                  color="bg-orange-500"
                  subtitle="orders"
                />
              </View>

              {/* Database Health Metrics */}
              {healthMetrics && (
                <>
                  <Text className="text-lg font-semibold text-gray-900 mb-4">
                    System Health
                  </Text>
                  <View className="flex-row mb-4">
                    <MetricCard
                      title="Total Customers"
                      value={healthMetrics.total_customers}
                      icon="users"
                      color="bg-indigo-500"
                    />
                    <MetricCard
                      title="With Balance"
                      value={customersWithBalance || 0}
                      icon="credit-card"
                      color="bg-pink-500"
                      subtitle="customers"
                    />
                  </View>

                  <View className="flex-row mb-4">
                    <MetricCard
                      title="Low Stock Items"
                      value={healthMetrics.low_stock_items}
                      icon="exclamation-triangle"
                      color="bg-orange-500"
                    />
                    <MetricCard
                      title="Out of Stock"
                      value={healthMetrics.out_of_stock_items}
                      icon="times-circle"
                      color="bg-red-500"
                    />
                  </View>

                  <View className="flex-row mb-6">
                    <MetricCard
                      title="Unpaid Invoices"
                      value={healthMetrics.unpaid_invoices}
                      icon="file-text-o"
                      color="bg-yellow-500"
                    />
                    <MetricCard
                      title="Monthly Revenue"
                      value={`₹${healthMetrics.total_revenue_this_month?.toLocaleString() || 0}`}
                      icon="calendar"
                      color="bg-emerald-500"
                    />
                  </View>
                </>
              )}

              {/* Inventory Turnover Analysis */}
              {inventoryTurnover && inventoryTurnover.length > 0 && (
                <>
                  <SectionCard title="Fast Moving Inventory">
                    <Text className="text-sm text-gray-600 mb-4">
                      Top performing items by turnover ratio ({selectedPeriod})
                    </Text>
                    {inventoryTurnover
                      .sort((a, b) => b.turnover_ratio - a.turnover_ratio)
                      .slice(0, 5)
                      .map((item, index) => (
                        <View
                          key={item.item_id}
                          className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                        >
                          <View className="flex-1">
                            <Text className="font-medium text-gray-900">
                              {item.item_name}
                            </Text>
                            <Text className="text-sm text-gray-600">
                              Sold: {item.total_sold} | Stock:{" "}
                              {item.closing_stock}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text className="font-semibold text-green-600">
                              {item.turnover_ratio.toFixed(2)}x
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {item.days_of_stock === 999
                                ? "∞ days"
                                : `${Math.round(item.days_of_stock)} days`}
                            </Text>
                          </View>
                        </View>
                      ))}
                  </SectionCard>

                  <SectionCard title="Slow Moving Inventory">
                    <Text className="text-sm text-gray-600 mb-4">
                      Items with high stock levels relative to sales
                    </Text>
                    {inventoryTurnover
                      .filter(
                        (item) =>
                          item.days_of_stock > 30 && item.days_of_stock !== 999
                      )
                      .sort((a, b) => b.days_of_stock - a.days_of_stock)
                      .slice(0, 5)
                      .map((item, index) => (
                        <View
                          key={item.item_id}
                          className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                        >
                          <View className="flex-1">
                            <Text className="font-medium text-gray-900">
                              {item.item_name}
                            </Text>
                            <Text className="text-sm text-gray-600">
                              Stock: {item.closing_stock} | Sold:{" "}
                              {item.total_sold}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text className="font-semibold text-orange-600">
                              {Math.round(item.days_of_stock)} days
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {item.turnover_ratio.toFixed(2)}x turnover
                            </Text>
                          </View>
                        </View>
                      ))}
                    {inventoryTurnover.filter(
                      (item) =>
                        item.days_of_stock > 30 && item.days_of_stock !== 999
                    ).length === 0 && (
                      <Text className="text-gray-500 text-center py-4">
                        No slow-moving inventory detected
                      </Text>
                    )}
                  </SectionCard>
                </>
              )}

              {/* Sales Trend */}
              <SectionCard title="Sales Trend (Last 6 Months)">
                {salesData?.salesByMonth.map((month, index) => (
                  <View
                    key={index}
                    className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <Text className="font-medium text-gray-900">
                      {month.month}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-sm text-gray-600 mr-4">
                        {month.orders} orders
                      </Text>
                      <Text className="font-semibold text-gray-900">
                        ₹{month.sales.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </SectionCard>

              {/* Top Customers */}
              <SectionCard title="Top Customers">
                {salesData?.topCustomers.length === 0 ? (
                  <Text className="text-gray-500 text-center py-4">
                    No customer data available
                  </Text>
                ) : (
                  salesData?.topCustomers.map((customer, index) => (
                    <View
                      key={index}
                      className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-gray-900">
                          {customer.name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {customer.orderCount} orders
                        </Text>
                      </View>
                      <Text className="font-semibold text-gray-900">
                        ₹{customer.totalSpent.toLocaleString()}
                      </Text>
                    </View>
                  ))
                )}
              </SectionCard>

              {/* Top Products */}
              <SectionCard title="Top Selling Products">
                {salesData?.topProducts.length === 0 ? (
                  <Text className="text-gray-500 text-center py-4">
                    No product data available
                  </Text>
                ) : (
                  salesData?.topProducts.map((product, index) => (
                    <View
                      key={index}
                      className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-gray-900">
                          {product.name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {product.quantitySold} units sold
                        </Text>
                      </View>
                      <Text className="font-semibold text-gray-900">
                        ₹{product.revenue.toLocaleString()}
                      </Text>
                    </View>
                  ))
                )}
              </SectionCard>

              {/* Payment Status */}
              <SectionCard title="Payment Status">
                <View className="space-y-3">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 bg-green-500 rounded-full mr-3" />
                      <Text className="text-gray-700">Paid</Text>
                    </View>
                    <Text className="font-semibold text-gray-900">
                      {salesData?.paymentStatus.paid || 0} orders
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 bg-yellow-500 rounded-full mr-3" />
                      <Text className="text-gray-700">Pending</Text>
                    </View>
                    <Text className="font-semibold text-gray-900">
                      {salesData?.paymentStatus.pending || 0} orders
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 bg-red-500 rounded-full mr-3" />
                      <Text className="text-gray-700">Overdue</Text>
                    </View>
                    <Text className="font-semibold text-gray-900">
                      {salesData?.paymentStatus.overdue || 0} orders
                    </Text>
                  </View>
                </View>
              </SectionCard>
            </>
          )}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
