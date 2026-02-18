import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { SectionCard } from "@/components/reports/SectionCard";
import { MetricCard } from "@/components/reports/MetricCard";
import { PaymentStatusChart } from "@/components/reports/PaymentStatusChart";
import { SalesChart } from "@/components/reports/SalesChart";
import { FontAwesome } from "@expo/vector-icons";
import { TopProductsList } from "@/components/reports/TopProductsList";
import { InventoryTurnoverList } from "@/components/reports/InventoryTurnoverList";
import { TopCustomersList } from "@/components/reports/TopCustomerList";
import {
  generateReportPdf,
  writeReportPdfToFile,
  shareReportPdf,
} from "@/lib/reportPdf";
import { useToastHelpers } from "@/lib/toast";
import { toISODateStringLocal } from "@/lib/date";
import { StandardHeader, StandardPage } from "@/components/layout";
import { Button, ButtonIcon, ButtonSpinner } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Card } from "@/components/ui/card";
import { Box } from "@/components/ui/box";
import { DownloadIcon } from "@/components/ui/icon";
import {
  useSalesReport,
  useDatabaseHealthMetrics,
  useInventoryTurnoverReport,
  useCustomerAgingAnalysisReport,
} from "@/hooks/useReports";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("year");
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { showSuccess, showError, showInfo } = useToastHelpers();

  const {
    data: salesData,
    isLoading,
    refetch: refetchSales,
  } = useSalesReport(selectedPeriod as any);

  const { data: healthMetrics, refetch: refetchHealth } =
    useDatabaseHealthMetrics();

  const { data: inventoryTurnover, refetch: refetchInventory } =
    useInventoryTurnoverReport(selectedPeriod as any);

  const { data: customerAgingAnalysis, refetch: refetchAging } =
    useCustomerAgingAnalysisReport();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSales(),
        refetchHealth(),
        refetchInventory(),
        refetchAging(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSales, refetchHealth, refetchInventory, refetchAging]);

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

        period: selectedPeriod,
        logo: require("../../assets/images/icon.png"),
      });

      const filename = `analytics-report-${selectedPeriod}-${toISODateStringLocal(
        new Date(),
      )}.pdf`;
      const filePath = await writeReportPdfToFile(pdfBytes, filename);
      showSuccess("Analytics report created successfully");

      await shareReportPdf(filePath);
    } catch (error: any) {
      showError(error.message || "Failed to generate PDF report");
    } finally {
      setIsExporting(false);
    }
  }, [salesData, healthMetrics, inventoryTurnover, selectedPeriod]);

  // Memoized values for performance
  const memoizedSalesData = useMemo(() => salesData, [salesData]);
  const memoizedInventoryTurnover = useMemo(
    () => inventoryTurnover,
    [inventoryTurnover],
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
  const periods = ["week", "month", "quarter", "year"] as const;

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
            value={memoizedSalesData?.orderStatus.pending || 0}
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
              {customerAgingAnalysis.slice(0, 5).map((customer) => (
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
