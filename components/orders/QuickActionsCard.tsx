import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface QuickActionsCardProps {
  onCreateInvoice: () => void;
  onEditOrder: () => void;
  onViewCustomer: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onCreateInvoice,
  onEditOrder,
  onViewCustomer,
}) => {
  return (
    <Box className="bg-background-0 border border-outline-200 rounded-xl p-5 shadow-sm">
      <VStack className="gap-4">
        <Text className="text-base font-semibold text-typography-900">
          Quick Actions
        </Text>
        <Button onPress={onCreateInvoice} className="justify-center">
          <ButtonText>Create Invoice</ButtonText>
        </Button>
        <HStack className="gap-3">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            onPress={onEditOrder}
          >
            <ButtonText>Edit Order</ButtonText>
          </Button>
          <Button
            variant="outline"
            className="flex-1 justify-center"
            onPress={onViewCustomer}
          >
            <ButtonText>Customer</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
