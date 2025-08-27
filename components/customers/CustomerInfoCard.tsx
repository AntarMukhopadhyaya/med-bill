import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card, SectionHeader } from "@/components/DesignSystem";

import { colors, spacing } from "@/components/DesignSystem";
import { Database } from "@/types/database.types";
type Customer = Database["public"]["Tables"]["customers"]["Row"];
interface CustomerInfoCardProps {
  customer: Customer;
  onCall: () => void;
  onEmail: () => void;
  onViewCustomer?: () => void; // Optional if you want to make the whole card clickable
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customer,
  onCall,
  onEmail,
  onViewCustomer,
}) => {
  return (
    <Card variant="elevated" padding={6}>
      <SectionHeader title="Contact Information" />

      <View style={{ gap: spacing[4] }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          <FontAwesome name="user" size={16} color={colors.gray[500]} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.gray[900],
              }}
            >
              {customer.name}
            </Text>
            {customer.company_name && (
              <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                {customer.company_name}
              </Text>
            )}
          </View>
        </View>

        {customer.phone && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
            onPress={onCall}
          >
            <FontAwesome name="phone" size={16} color={colors.primary[500]} />
            <Text style={{ fontSize: 14, color: colors.primary[600], flex: 1 }}>
              {customer.phone}
            </Text>
            <FontAwesome
              name="external-link"
              size={12}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
        )}

        {customer.email && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
            onPress={onEmail}
          >
            <FontAwesome
              name="envelope"
              size={16}
              color={colors.primary[500]}
            />
            <Text style={{ fontSize: 14, color: colors.primary[600], flex: 1 }}>
              {customer.email}
            </Text>
            <FontAwesome
              name="external-link"
              size={12}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
        )}

        {customer.gstin && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
          >
            <FontAwesome name="file-text" size={16} color={colors.gray[500]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                GSTIN
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {customer.gstin}
              </Text>
            </View>
          </View>
        )}

        {customer.billing_address && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: spacing[3],
            }}
          >
            <FontAwesome
              name="map-marker"
              size={16}
              color={colors.gray[500]}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                Billing Address
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[900],
                  lineHeight: 20,
                }}
              >
                {customer.billing_address}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
};
