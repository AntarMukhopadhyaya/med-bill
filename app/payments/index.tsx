import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { HeaderWithSearch, spacing, colors } from "@/components/DesignSystem";
import { router } from "expo-router";

export default function PaymentsList() {
  const [search, setSearch] = React.useState("");

  const {
    data: payments = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["payments-list", search],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false })
        .limit(100);
      if (search.trim()) {
        // rudimentary search by reference number
        query = query.ilike("reference_number", `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <HeaderWithSearch
        title="Payments"
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search ref #"
        showAddButton={true}
        onAdd={() => router.push("/payments/create" as any)}
      />
      <FlatList
        data={payments}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        contentContainerStyle={{ padding: spacing[6] }}
        ListEmptyComponent={() => (
          <View style={{ padding: spacing[10], alignItems: "center" }}>
            <Text style={{ color: colors.gray[500] }}>
              {isLoading ? "Loading..." : "No payments found"}
            </Text>
          </View>
        )}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            onPress={() => router.push(`/payments/${item.id}` as any)}
            style={{
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.gray[200],
              borderRadius: 8,
              padding: spacing[4],
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.gray[900] }}>
              ₹{Number(item.amount).toLocaleString()}
            </Text>
            <Text style={{ color: colors.gray[600] }}>
              {new Date(item.payment_date).toLocaleDateString()} •{" "}
              {item.payment_method}
            </Text>
            {item.reference_number && (
              <Text style={{ color: colors.gray[500], fontSize: 12 }}>
                Ref: {item.reference_number}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
