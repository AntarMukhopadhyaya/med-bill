import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AgingRow {
  customer_id: string;
  customer_name: string;
  current_balance: number;
  days_0_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
}

export const useAgingAnalysis = () => {
  return useQuery<AgingRow[]>({
    queryKey: ["aging-analysis"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_customer_aging_analysis"
      );
      if (error) throw error;
      return (data || []) as AgingRow[];
    },
    staleTime: 5 * 60_000,
  });
};
