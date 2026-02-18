import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardStats,
  DashboardStats,
} from "@/services/dashboard.service";

export const useDashboardStats = () => {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
