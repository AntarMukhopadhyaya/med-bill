import React from "react";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/ui/card";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Database } from "@/types/database.types";
import { Pressable } from "../ui/pressable";
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
    <Card className="p-6">
      {/* Section Header */}
      <Text className="text-lg font-semibold text-typography-900 mb-4">
        Contact Information
      </Text>

      <VStack className="gap-4">
        {/* Customer Name */}
        <HStack className="items-center gap-3">
          <FontAwesome
            name="user"
            size={16}
            color="rgb(var(--color-typography-500))"
          />
          <VStack className="flex-1">
            <Text className="text-sm font-semibold text-typography-900">
              {customer.name}
            </Text>
            {customer.company_name && (
              <Text className="text-xs text-typography-600">
                {customer.company_name}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Phone */}
        {customer.phone && (
          <Pressable onPress={onCall}>
            <HStack className="items-center gap-3">
              <FontAwesome name="phone" size={16} color="bg-primary-500" />
              <Text className="text-sm text-primary-600 flex-1">
                {customer.phone}
              </Text>
              <FontAwesome
                name="external-link"
                size={12}
                color="typography-400"
              />
            </HStack>
          </Pressable>
        )}

        {/* Email */}
        {customer.email && (
          <Pressable onPress={onEmail}>
            <HStack className="items-center gap-3">
              <FontAwesome name="envelope" size={16} color="bg-primary-500" />
              <Text className="text-sm text-primary-600 flex-1">
                {customer.email}
              </Text>
              <FontAwesome
                name="external-link"
                size={12}
                color="rgb(var(--color-typography-400))"
              />
            </HStack>
          </Pressable>
        )}

        {/* GSTIN */}
        {customer.gstin && (
          <HStack className="items-center gap-3">
            <FontAwesome
              name="file-text"
              size={16}
              color="rgb(var(--color-typography-500))"
            />
            <VStack className="flex-1">
              <Text className="text-xs text-typography-600">GSTIN</Text>
              <Text className="text-sm font-semibold text-typography-900">
                {customer.gstin}
              </Text>
            </VStack>
          </HStack>
        )}

        {/* Billing Address */}
        {customer.billing_address && (
          <HStack className="items-start gap-3">
            <FontAwesome
              name="map-marker"
              size={16}
              color="rgb(var(--color-typography-500))"
              style={{ marginTop: 2 }}
            />
            <VStack className="flex-1">
              <Text className="text-xs text-typography-600">
                Billing Address
              </Text>
              <Text className="text-sm text-typography-900 leading-5">
                {customer.billing_address}
              </Text>
            </VStack>
          </HStack>
        )}
      </VStack>
    </Card>
  );
};
