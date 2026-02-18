import React from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
  Linking,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/ui/card";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import { SectionHeader } from "@/components/layout";
import { EmptyState } from "@/components/EmptyState";
import { Database } from "@/types/database.types";
import { CustomerInfoCard } from "@/components/customers/CustomerInfoCard";
import { StandardHeader, StandardPage } from "@/components/layout";
import { HStack, VStack } from "@gluestack-ui/themed";
import { Alert as GSAlert, AlertText } from "@/components/ui/alert";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@/components/ui/modal";
import { useState } from "react";
import {
  useCustomerDetails,
  useCustomerDeleteMutation,
} from "@/hooks/useCustomers";
import { formatDate } from "@/lib/date";

export default function CustomerDetailsPage() {
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  // Fetch customer with related data
  const {
    data: customer,
    isLoading,
    isRefetching,
    refetch,
  } = useCustomerDetails(id);

  // Delete customer mutation
  const deleteCustomerMutation = useCustomerDeleteMutation();

  const handleEdit = () => {
    router.push(`/customers/${id}/edit` as any);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  const handleViewOrders = () => {
    router.push({
      pathname: "/(tabs)/orders",
      params: { customerId: id },
    } as any);
  };

  const handleViewInvoices = () => {
    router.push({
      pathname: "/(tabs)/invoices",
      params: { customerId: id },
    } as any);
  };

  const handleCreateOrder = () => {
    router.push({
      pathname: "/orders/create",
      params: { customerId: id },
    } as any);
  };

  if (isLoading) {
    return (
      <StandardPage>
        <StandardHeader title="Customer Details" showBackButton />
        <VStack className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon="spinner"
            title="Loading Customer"
            description="Fetching customer details..."
          />
        </VStack>
      </StandardPage>
    );
  }

  if (!customer) {
    return (
      <StandardPage>
        <StandardHeader title="Customer Not Found" showBackButton />
        <VStack className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon="user-times"
            title="Customer Not Found"
            description="The customer you're looking for doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </VStack>
      </StandardPage>
    );
  }

  return (
    <StandardPage>
      {feedback && (
        <GSAlert
          action={feedback.type === "success" ? "success" : "error"}
          variant="outline"
          className="mx-6 mb-4"
        >
          <AlertText className="font-semibold">{feedback.message}</AlertText>
        </GSAlert>
      )}
      <StandardHeader
        title={
          customer.name.length > 20
            ? `${customer.name.slice(0, 20)}...`
            : customer.name
        }
        subtitle={
          customer.company_name
            ? customer.company_name.length > 20
              ? `${customer.company_name.slice(0, 20)}...`
              : customer.company_name
            : "Individual Customer"
        }
        showBackButton={true}
        rightElement={
          <HStack className="gap-2 flex-row">
            <Button
              onPress={handleEdit}
              variant="outline"
              size="sm"
              action="secondary"
            >
              <FontAwesome name="edit" size={14} />
            </Button>
            <Button
              onPress={handleDelete}
              variant="outline"
              size="sm"
              action="negative"
            >
              <FontAwesome name="trash" size={14} />
            </Button>
          </HStack>
        }
      ></StandardHeader>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-24">
        <VStack className="mb-4">
          <CustomerInfoCard
            customer={customer}
            onCall={handleCall}
            onEmail={handleEmail}
          />
        </VStack>

        {/* Stats Cards */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {/** Reusable mini stat card component inline */}
          <Card
            variant="elevated"
            className="p-4 items-center justify-center gap-2 h-32 flex-1 min-w-[100px]"
          >
            <FontAwesome name="shopping-cart" size={20} />
            <Text className="text-xs text-typography-600 text-center">
              Total Orders
            </Text>
            <Text className="text-lg font-bold text-primary-600 dark:text-primary-500">
              {customer.total_orders}
            </Text>
          </Card>
          <Card
            variant="elevated"
            className="p-4 items-center justify-center gap-2 h-32 flex-1 min-w-[100px]"
          >
            <FontAwesome name="line-chart" size={20} />
            <Text className="text-xs text-typography-600 text-center">
              Total Revenue
            </Text>
            <Text className="text-lg font-bold text-success-600 dark:text-success-500">
              ₹{customer.total_revenue?.toLocaleString()}
            </Text>
          </Card>
          <Card
            variant="elevated"
            className="p-4 items-center justify-center gap-2 h-32 flex-1 min-w-[100px]"
          >
            <FontAwesome name="exclamation-triangle" size={20} />
            <Text className="text-xs text-typography-600 text-center">
              Pending Amount
            </Text>
            <Text className="text-lg font-bold text-warning-600 dark:text-warning-500">
              ₹{customer.pending_amount?.toLocaleString()}
            </Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card variant="elevated" className="p-4 mb-6">
          <SectionHeader title="Quick Actions" />
          <VStack className="gap-3">
            <Button
              onPress={handleCreateOrder}
              action="primary"
              variant="solid"
            >
              <FontAwesome name="plus-circle" size={16} />
              <ButtonText>Create New Order</ButtonText>
            </Button>
            <HStack className="gap-3">
              <VStack className="flex-1">
                <Button
                  onPress={handleViewOrders}
                  variant="outline"
                  action="secondary"
                >
                  <FontAwesome name="shopping-cart" size={16} />
                  <ButtonText>View Orders</ButtonText>
                </Button>
              </VStack>
              <VStack className="flex-1">
                <Button
                  onPress={handleViewInvoices}
                  variant="outline"
                  action="secondary"
                >
                  <FontAwesome name="file-text" size={16} />
                  <ButtonText>View Invoices</ButtonText>
                </Button>
              </VStack>
            </HStack>
          </VStack>
        </Card>

        {/* Recent Orders */}
        {customer.orders && customer.orders.length > 0 && (
          <Card variant="elevated" className="p-4 mb-6">
            <SectionHeader
              title="Recent Orders"
              subtitle={`${customer.orders.length} orders`}
              rightElement={
                <Button
                  onPress={handleViewOrders}
                  variant="link"
                  size="sm"
                  action="primary"
                >
                  <ButtonText>View All</ButtonText>
                </Button>
              }
            />
            <VStack className="gap-3">
              {customer.orders.slice(0, 3).map((order: any) => (
                <Pressable
                  key={order.id}
                  onPress={() => router.push(`/orders/${order.id}` as any)}
                  className="flex-row items-center justify-between p-3 bg-background-50 dark:bg-background-100 rounded-lg active:opacity-80"
                >
                  <VStack className="flex-1">
                    <Text className="text-sm font-semibold text-typography-900">
                      {order.order_number}
                    </Text>
                    <Text className="text-xs text-typography-600">
                      {formatDate(order.order_date)}
                    </Text>
                  </VStack>
                  <VStack className="items-end">
                    <Text className="text-sm font-semibold text-typography-900">
                      ₹{order.total_amount.toLocaleString()}
                    </Text>
                    <Badge
                      variant={
                        order.order_status === "pending" ? "success" : "warning"
                      }
                      size="sm"
                    >
                      <BadgeText>{order.order_status}</BadgeText>
                    </Badge>
                  </VStack>
                </Pressable>
              ))}
            </VStack>
          </Card>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="md"
      >
        <ModalBackdrop onPress={() => setShowDeleteConfirm(false)} />
        <ModalContent>
          <ModalHeader className="border-b border-outline-200 mb-4">
            <HStack className="items-center justify-between w-full">
              <Text className="text-base font-semibold text-typography-900">
                Delete Customer
              </Text>
            </HStack>
          </ModalHeader>
          <ModalBody>
            <Text className="text-sm text-typography-700 mb-4">
              Are you sure you want to delete this customer? This action cannot
              be undone.
            </Text>
            <HStack className="gap-3 justify-end">
              <Button
                variant="outline"
                onPress={() => setShowDeleteConfirm(false)}
                action="secondary"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                action="negative"
                variant="outline"
                onPress={() => {
                  deleteCustomerMutation.mutate(id as string, {
                    onSuccess: () => {
                      setShowDeleteConfirm(false);
                      setFeedback({
                        type: "success",
                        message: "Customer deleted successfully",
                      });
                      router.back();
                    },
                    onError: (error: any) => {
                      setShowDeleteConfirm(false);
                      setFeedback({
                        type: "error",
                        message: error?.message || "Failed to delete customer",
                      });
                    },
                  });
                }}
                disabled={deleteCustomerMutation.isPending}
              >
                {deleteCustomerMutation.isPending ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <FontAwesome name="trash" size={16} />
                    <ButtonText>Delete</ButtonText>
                  </>
                )}
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
}
