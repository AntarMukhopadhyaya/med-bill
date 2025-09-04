import { supabase } from "@/lib/supabase";
import {
  CustomerAgingItem,
  DatabaseHealthMetrics,
  InventoryTurnoverItem,
  LedgerSummary,
  SalesData,
} from "@/types/reports";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";
import { ScrollView } from "react-native";
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
import { StandardHeader, StandardPage } from "@/components/layout";
import { Button, ButtonIcon, ButtonSpinner } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Card } from "@/components/ui/card";
import { Box } from "@/components/ui/box";
import { DownloadIcon } from "@/components/ui/icon";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { showSuccess, showError, showInfo } = useToastHelpers();

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

      if (error) throw error;

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

  // Other queries
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

      const { data } = await supabase
        .rpc("get_inventory_turnover_report", {
          start_date: startDate.toISOString(),
          end_date: now.toISOString(),
        } as any)
        .throwOnError();

      if (data && data.length > 0) {
        const itemIds = data.map((item: any) => item.item_id);
        const { data: inventoryData } = await supabase
          .from("inventory")
          .select("id, restock_at")
          .in("id", itemIds);

        return data.map((item: any) => ({
          ...item,
          restock_date: inventoryData?.find(
            (inv: any) => inv.id === item.item_id
          )?.restock_at,
        }));
      }

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

  const { data: customerAgingAnalysis } = useQuery({
    queryKey: ["customer-aging-analysis"],
    queryFn: async (): Promise<CustomerAgingItem[]> => {
      const { data, error } = await supabase.rpc(
        "get_customer_aging_analysis",
        {
          days_30: 30,
          days_60: 60,
          days_90: 90,
        } as any
      );
      if (error) {
        console.error("Error fetching customer aging analysis:", error);
      }
      return data || [];
    },
  });

  const { data: ledgerSummary } = useQuery({
    queryKey: ["ledger-summary"],
    queryFn: async (): Promise<LedgerSummary | null> => {
      const { data, error } = await supabase.rpc("get_ledger_summary");
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const exportToPDF = useCallback(async () => {
    if (!salesData) {
      showError("No data available to export");

      return;
    }

    try {
      setIsExporting(true);
      showInfo("Creating comprehensive analytics report...");

      const pdfBytes = await generateReportPdf({
        salesData,
        healthMetrics,
        inventoryTurnover,
        customersWithBalance,
        period: selectedPeriod,
        logo: require("../../assets/images/icon.png"),
      });

      const filename = `analytics-report-${selectedPeriod}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      const filePath = await writeReportPdfToFile(pdfBytes, filename);
      showSuccess("Analytics report created successfully");

      await shareReportPdf(filePath);
    } catch (error: any) {
      showError(error.message || "Failed to generate PDF report");
    } finally {
      setIsExporting(false);
    }
  }, [
    salesData,
    healthMetrics,
    inventoryTurnover,
    customersWithBalance,
    selectedPeriod,
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
      <VStack className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator />
        <Text className="mt-4 text-typography-600">Loading reports...</Text>
      </VStack>
    );
  }
  const periods = ["daily", "weekly", "monthly", "yearly"] as const;

  return (
    <StandardPage>
      <StandardHeader
        title="Analytics"
        subtitle={`${selectedPeriod.toUpperCase()} Overview`}
        showAddButton={false}
        showFiltersButton={false}
        rightElement={
          <Button
            onPress={exportToPDF}
            disabled={isExporting}
            className="p-2"
            variant="outline"
          >
            {isExporting ? <ButtonSpinner /> : <ButtonIcon as={DownloadIcon} />}
          </Button>
        }
      />
      {/* Period Selection */}
      <Box className="px-4 py-3 bg-background-0 border-b border-border">
        <HStack className="gap-2">
          {periods.map((period) => {
            const active = selectedPeriod === period;
            return (
              <Pressable
                key={period}
                onPress={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-full border ${
                  active
                    ? "bg-primary-600 border-primary-600"
                    : "bg-background border-outline-300"
                }`}
              >
                <Text
                  className={`font-semibold text-sm ${
                    active ? "text-primary-50" : "text-typography-600"
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      </Box>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Key Metrics */}
        <HStack className="flex-wrap mb-4">
          <MetricCard
            title="Total Sales"
            value={`₹${memoizedSalesData?.totalSales?.toLocaleString() || 0}`}
            icon="money"
            color="bg-success-600"
          />
          <MetricCard
            title="Total Orders"
            value={memoizedSalesData?.totalOrders || 0}
            icon="shopping-cart"
            color="bg-primary-600"
          />
          <MetricCard
            title="Avg Order Value"
            value={`₹${memoizedSalesData?.averageOrderValue?.toFixed(0) || 0}`}
            icon="calculator"
            color="bg-secondary-600"
          />
          <MetricCard
            title="Payment Pending"
            value={memoizedSalesData?.paymentStatus.pending || 0}
            icon="clock-o"
            color="bg-warning-600"
            subtitle="orders"
          />
        </HStack>

        {/* Sales Chart */}
        {memoizedSalesData && memoizedSalesData.salesByMonth.length > 0 && (
          <SectionCard
            title="Sales Trend"
            action={
              <Pressable onPress={() => {}} className="p-1 rounded-md">
                <FontAwesome name="expand" size={16} color="#6b7280" />
              </Pressable>
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
            <Text className="text-lg font-semibold text-typography-900 mb-4 mt-6">
              System Health
            </Text>
            <HStack className="flex-wrap mb-4">
              <MetricCard
                title="Total Customers"
                value={memoizedHealthMetrics.total_customers}
                icon="users"
                color="bg-secondary-600"
              />
              <MetricCard
                title="With Balance"
                value={customersWithBalance || 0}
                icon="credit-card"
                color="bg-accent-600"
                subtitle="customers"
              />
              <MetricCard
                title="Low Stock Items"
                value={memoizedHealthMetrics.low_stock_items}
                icon="exclamation-triangle"
                color="bg-warning-600"
              />
              <MetricCard
                title="Out of Stock"
                value={memoizedHealthMetrics.out_of_stock_items}
                icon="times-circle"
                color="bg-error-600"
              />
            </HStack>
          </>
        )}

        {/* Inventory Turnover */}
        {memoizedInventoryTurnover && memoizedInventoryTurnover.length > 0 && (
          <SectionCard title="Inventory Turnover Analysis">
            <InventoryTurnoverList data={memoizedInventoryTurnover} />
          </SectionCard>
        )}

        {/* Customer Aging Analysis - CRITICAL for cash flow */}
        {customerAgingAnalysis && customerAgingAnalysis.length > 0 && (
          <SectionCard title="Accounts Receivable Aging">
            <Box className="p-4">
              <Text className="text-sm font-semibold text-typography-700 mb-3">
                Outstanding Receivables by Age
              </Text>
              {customerAgingAnalysis
                .slice(0, 5)
                .map((customer: CustomerAgingItem) => (
                  <Box
                    key={customer.customer_id}
                    className="mb-3 p-3 bg-background-50 rounded-lg border border-outline-100"
                  >
                    <Text className="font-semibold text-typography-900">
                      {customer.customer_name}
                    </Text>
                    <HStack className="justify-between mt-2">
                      <Text className="text-xs text-success-600">
                        0-30d: ₹{customer.days_0_30}
                      </Text>
                      <Text className="text-xs text-warning-600">
                        31-60d: ₹{customer.days_31_60}
                      </Text>
                      <Text className="text-xs text-orange-600">
                        61-90d: ₹{customer.days_61_90}
                      </Text>
                      <Text className="text-xs text-error-600">
                        90+d: ₹{customer.days_over_90}
                      </Text>
                    </HStack>
                    <Text className="text-sm font-semibold mt-2">
                      Total Due: ₹{customer.current_balance}
                    </Text>
                  </Box>
                ))}
              {customerAgingAnalysis.length > 5 && (
                <Text className="text-sm text-typography-500 text-center mt-2">
                  +{customerAgingAnalysis.length - 5} more customers
                </Text>
              )}
            </Box>
          </SectionCard>
        )}

        {/* Ledger Summary - Financial Health Overview */}
        {ledgerSummary && (
          <SectionCard title="Financial Summary">
            <Box className="p-4">
              <HStack className="justify-between mb-3">
                <Text className="text-sm font-semibold">
                  Total Receivables:
                </Text>
                <Text className="text-sm font-semibold text-success-600">
                  ₹{ledgerSummary.total_outstanding_receivables}
                </Text>
              </HStack>
              <HStack className="justify-between mb-3">
                <Text className="text-sm font-semibold">Total Payables:</Text>
                <Text className="text-sm font-semibold text-error-600">
                  ₹{ledgerSummary.total_outstanding_payables}
                </Text>
              </HStack>
              <HStack className="justify-between mb-3">
                <Text className="text-sm font-semibold">Net Position:</Text>
                <Text
                  className={`text-sm font-semibold ${
                    ledgerSummary.net_position >= 0
                      ? "text-success-600"
                      : "text-error-600"
                  }`}
                >
                  ₹{ledgerSummary.net_position}
                </Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="text-xs text-typography-500">
                  {ledgerSummary.customers_with_positive_balance} owe you
                </Text>
                <Text className="text-xs text-typography-500">
                  You owe {ledgerSummary.customers_with_negative_balance}
                </Text>
              </HStack>
            </Box>
          </SectionCard>
        )}

        {/* Top Customers */}
        {memoizedSalesData && memoizedSalesData.topCustomers.length > 0 && (
          <TopCustomersList data={memoizedSalesData.topCustomers} />
        )}

        {/* Top Products */}
        {memoizedSalesData && memoizedSalesData.topProducts.length > 0 && (
          <TopProductsList data={memoizedSalesData.topProducts} />
        )}
      </ScrollView>
    </StandardPage>
  );
}
