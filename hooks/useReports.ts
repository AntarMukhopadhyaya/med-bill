import { useQuery } from "@tanstack/react-query";
import {
  SalesData,
  DatabaseHealthMetrics,
  InventoryTurnoverItem,
  CustomerAgingItem,
} from "@/types/reports";
import {
  fetchSalesReport,
  fetchDatabaseHealthMetrics,
  fetchInventoryTurnover,
  fetchCustomerAgingAnalysis,
} from "@/services/report.service";

export type ReportPeriod = "week" | "month" | "quarter" | "year";

const getPeriodRange = (period: ReportPeriod) => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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
    case "month":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return {
    startDateIso: startDate.toISOString(),
    endDateIso: now.toISOString(),
  };
};

export const useSalesReport = (period: ReportPeriod) => {
  return useQuery<SalesData>({
    queryKey: ["sales-report", period],
    queryFn: async () => {
      const { startDateIso, endDateIso } = getPeriodRange(period);
      return fetchSalesReport(startDateIso, endDateIso);
    },
  });
};

export const useDatabaseHealthMetrics = () => {
  return useQuery<DatabaseHealthMetrics>({
    queryKey: ["database-health"],
    queryFn: fetchDatabaseHealthMetrics,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useInventoryTurnoverReport = (period: ReportPeriod) => {
  return useQuery<InventoryTurnoverItem[]>({
    queryKey: ["inventory-turnover", period],
    queryFn: async () => {
      const { startDateIso, endDateIso } = getPeriodRange(period);
      return fetchInventoryTurnover(startDateIso, endDateIso);
    },
  });
};

export const useCustomerAgingAnalysisReport = () => {
  return useQuery<CustomerAgingItem[]>({
    queryKey: ["customer-aging-analysis"],
    queryFn: fetchCustomerAgingAnalysis,
    staleTime: 5 * 60 * 1000,
  });
};
