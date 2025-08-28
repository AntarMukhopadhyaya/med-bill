import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LedgerSummary {
  total_customers: number;
  customers_with_positive_balance: number;
  customers_with_negative_balance: number;
  customers_with_zero_balance: number;
  total_outstanding_receivables: number;
  total_outstanding_payables: number;
  net_position: number;
}

export const useLedgerSummary = () => {
  return useQuery<LedgerSummary | null>({
    queryKey: ["ledger-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_ledger_summary");
      if (error) throw error;
      return data && data.length > 0 ? (data[0] as LedgerSummary) : null;
    },
    staleTime: 60_000,
  });
};
