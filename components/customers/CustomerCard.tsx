import React, { memo } from "react";
import { Database } from "@/types/database.types";
import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { Card, colors, spacing } from "@/components/DesignSystem";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface CustomerCardProps {
  customer: Customer;
  onDelete: (customer: Customer) => void;
}

const CustomerCardComponent: React.FC<CustomerCardProps> = ({
  customer,
  onDelete,
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        router.push(`/customers/${customer.id}` as any);
      }}
    >
      <Card variant="elevated" padding={4}>
        <View style={{ gap: spacing[3] }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {customer.name}
              </Text>
              {customer.company_name && (
                <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                  {customer.company_name}
                </Text>
              )}
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.gray[400]}
              style={{ marginLeft: spacing[2] }}
            />
          </View>

          {/* Contact Info */}
          <View
            style={{
              padding: spacing[2],
              backgroundColor: colors.gray[50],
              borderRadius: 6,
              gap: spacing[1],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[2],
              }}
            >
              <FontAwesome name="phone" size={12} color={colors.primary[500]} />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.gray[900],
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {customer.phone}
              </Text>
            </View>

            {customer.email && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <FontAwesome
                  name="envelope"
                  size={12}
                  color={colors.primary[500]}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.gray[900],
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {customer.email}
                </Text>
              </View>
            )}

            {customer.gstin && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <FontAwesome
                  name="id-card"
                  size={12}
                  color={colors.primary[500]}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.gray[900],
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  GSTIN: {customer.gstin}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: spacing[2],
              paddingTop: spacing[2],
              borderTopWidth: 1,
              borderTopColor: colors.gray[100],
            }}
          >
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${customer.phone}`)}
              style={{
                backgroundColor: colors.success[50],
                padding: spacing[2],
                borderRadius: 6,
              }}
            >
              <FontAwesome name="phone" size={16} color={colors.success[600]} />
            </TouchableOpacity>
            {customer.email && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`mailto:${customer.email}`)}
                style={{
                  backgroundColor: colors.info[50],
                  padding: spacing[2],
                  borderRadius: 6,
                }}
              >
                <FontAwesome
                  name="envelope"
                  size={16}
                  color={colors.info[600]}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push(`/customers/${customer.id}/edit`)}
              style={{
                backgroundColor: colors.gray[50],
                padding: spacing[2],
                borderRadius: 6,
              }}
            >
              <FontAwesome name="edit" size={16} color={colors.gray[600]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(customer)}
              style={{
                backgroundColor: colors.error[50],
                padding: spacing[2],
                borderRadius: 6,
              }}
            >
              <FontAwesome name="trash" size={16} color={colors.error[600]} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export const CustomerCard = memo(CustomerCardComponent);
