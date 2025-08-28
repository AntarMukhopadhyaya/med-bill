import { supabase } from "@/lib/supabase";
import {
  DatabaseHealthMetrics,
  InventoryTurnoverItem,
  SalesData,
} from "@/types/reports";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SectionCard } from "@/components/reports/SectionCard";
import { MetricCard } from "@/components/reports/MetricCard";
import { PaymentStatusChart } from "@/components/reports/PaymentStatusChart";
import { SalesChart } from "@/components/reports/SalesChart";
import { FontAwesome } from "@expo/vector-icons";
import { PeriodSelector } from "@/components/reports/PeriodSelector";
import { TopProductsList } from "@/components/reports/TopProductsList";
import { InventoryTurnoverList } from "@/components/reports/InventoryTurnoverList";
import { TopCustomersList } from "@/components/reports/TopCustomerList";
import { Page } from "@/components/Page";
import {
  generateReportPdf,
  writeReportPdfToFile,
  shareReportPdf,
} from "@/lib/reportPdf";
import { useToastHelpers } from "@/lib/toast";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { showSuccess, showError } = useToastHelpers();

  // Fetch sales data
  const {
    data: salesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sales-report", selectedPeriod],
    queryFn: async (): Promise<SalesData> => {
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

      const { data, error } = await (supabase as any).rpc(
        "get_sales_report_data",
        {
          p_start_date: startDate.toISOString(),
          p_end_date: now.toISOString(),
        }
      );
      console.log(JSON.stringify(data));

      if (error) throw error;

      // The RPC returns an array with a single result object
      const result = (data as any)?.[0] || {};

      return {
        totalSales: result.total_sales || 0,
        totalOrders: Number(result.total_orders) || 0,
        averageOrderValue: result.average_order_value || 0,
        topCustomers: result.top_customers || [],
        topProducts: result.top_products || [],
        salesByMonth: result.sales_by_month || [],
        paymentStatus: result.payment_status || {
          paid: 0,
          pending: 0,
          overdue: 0,
        },
      };
    },
  });

  // Other queries remain the same...
  const { data: healthMetrics } = useQuery({
    queryKey: ["database-health"],
    queryFn: async (): Promise<DatabaseHealthMetrics> => {
      const { data, error } = await supabase.rpc("get_database_health_metrics");

      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: inventoryTurnover } = useQuery({
    queryKey: ["inventory-turnover", selectedPeriod],
    queryFn: async (): Promise<InventoryTurnoverItem[]> => {
      const now = new Date();
      let startDate: Date;

      switch (selectedPeriod) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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

  const { data: customersWithBalance } = useQuery({
    queryKey: ["customers-with-balance"],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc(
        "get_total_customers_with_balance"
      );
      if (error) throw error;
      return data || 0;
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const exportToPDF = useCallback(async () => {
    if (!salesData) {
      showError("Error", "No data available to export");
      return;
    }

    try {
      setIsExporting(true);
      showSuccess(
        "Generating PDF",
        "Creating comprehensive analytics report..."
      );

      const pdfBytes = await generateReportPdf({
        salesData,
        healthMetrics,
        inventoryTurnover,
        customersWithBalance,
        period: selectedPeriod,
        logo: require("@/assets/images/icon.png"),
      });

      const filename = `analytics-report-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.pdf`;
      const filePath = await writeReportPdfToFile(pdfBytes, filename);

      showSuccess("PDF Generated", "Analytics report created successfully");
      await shareReportPdf(filePath);
    } catch (error: any) {
      showError(
        "Export Error",
        error.message || "Failed to generate PDF report"
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    salesData,
    healthMetrics,
    inventoryTurnover,
    customersWithBalance,
    selectedPeriod,
    showSuccess,
    showError,
  ]);

  // Memoized values for performance
  const memoizedSalesData = useMemo(() => salesData, [salesData]);
  const memoizedInventoryTurnover = useMemo(
    () => inventoryTurnover,
    [inventoryTurnover]
  );
  const memoizedHealthMetrics = useMemo(() => healthMetrics, [healthMetrics]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading reports...</Text>
      </View>
    );
  }
  const periods = ["daily", "weekly", "monthly", "yearly"] as const;

  return (
    <Page
      title="Analytics"
      subtitle={`${selectedPeriod.toUpperCase()} Overview`}
      right={
        <TouchableOpacity
          onPress={exportToPDF}
          disabled={isExporting}
          className="p-2"
        >
          {isExporting ? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <FontAwesome name="file-pdf-o" size={24} color="#3b82f6" />
          )}
        </TouchableOpacity>
      }
      scroll={false}
    >
      {/* Period Selection */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row space-x-2">
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-full ${
                selectedPeriod === period ? "bg-blue-500" : "bg-gray-100"
              }`}
            >
              <Text
                className={`font-semibold ${
                  selectedPeriod === period ? "text-white" : "text-gray-600"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Key Metrics */}
        <View className="flex-row mb-4 flex-wrap">
          <MetricCard
            title="Total Sales"
            value={`₹${memoizedSalesData?.totalSales?.toLocaleString() || 0}`}
            icon="money"
            color="bg-green-500"
          />
          <MetricCard
            title="Total Orders"
            value={memoizedSalesData?.totalOrders || 0}
            icon="shopping-cart"
            color="bg-blue-500"
          />
          <MetricCard
            title="Avg Order Value"
            value={`₹${memoizedSalesData?.averageOrderValue?.toFixed(0) || 0}`}
            icon="calculator"
            color="bg-purple-500"
          />
          <MetricCard
            title="Payment Pending"
            value={memoizedSalesData?.paymentStatus.pending || 0}
            icon="clock-o"
            color="bg-orange-500"
            subtitle="orders"
          />
        </View>

        {/* Sales Chart */}
        {memoizedSalesData && memoizedSalesData.salesByMonth.length > 0 && (
          <SectionCard
            title="Sales Trend"
            action={
              <TouchableOpacity onPress={() => {}}>
                <FontAwesome name="expand" size={16} color="#6b7280" />
              </TouchableOpacity>
            }
          >
            <SalesChart data={memoizedSalesData} />
          </SectionCard>
        )}

        {/* Payment Status Chart */}
        {memoizedSalesData && (
          <SectionCard title="Payment Status">
            <PaymentStatusChart data={memoizedSalesData} />
          </SectionCard>
        )}

        {/* Database Health Metrics */}
        {memoizedHealthMetrics && (
          <>
            <Text className="text-lg font-semibold text-gray-900 mb-4 mt-6">
              System Health
            </Text>
            <View className="flex-row mb-4 flex-wrap">
              <MetricCard
                title="Total Customers"
                value={memoizedHealthMetrics.total_customers}
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
              <MetricCard
                title="Low Stock Items"
                value={memoizedHealthMetrics.low_stock_items}
                icon="exclamation-triangle"
                color="bg-orange-500"
              />
              <MetricCard
                title="Out of Stock"
                value={memoizedHealthMetrics.out_of_stock_items}
                icon="times-circle"
                color="bg-red-500"
              />
            </View>
          </>
        )}

        {/* Inventory Turnover */}
        {memoizedInventoryTurnover && memoizedInventoryTurnover.length > 0 && (
          <SectionCard title="Inventory Turnover Analysis">
            <InventoryTurnoverList data={memoizedInventoryTurnover} />
          </SectionCard>
        )}

        {/* Top Customers */}
        {memoizedSalesData && memoizedSalesData.topCustomers.length > 0 && (
          <SectionCard title="Top Customers">
            <TopCustomersList data={memoizedSalesData.topCustomers} />
          </SectionCard>
        )}

        {/* Top Products */}
        {memoizedSalesData && memoizedSalesData.topProducts.length > 0 && (
          <SectionCard title="Top Selling Products">
            <TopProductsList data={memoizedSalesData.topProducts} />
          </SectionCard>
        )}
      </ScrollView>
    </Page>
  );
}
