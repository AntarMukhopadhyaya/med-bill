import React, { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Linking } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
// Removed legacy DesignSystem container & Button; using Gluestack + custom components
import { EmptyState } from "@/components/DesignSystem"; // TODO: migrate EmptyState later
import { Text } from "@/components/ui/text";
import { StandardPage } from "@/components/layout/StandardPage";
import { StandardHeader } from "@/components/layout/StandardHeader";
import {
  Button as GSButton,
  ButtonText,
  ButtonSpinner,
} from "@/components/ui/button";
import { MenuItem, OrderWithRelations } from "@/types/orders";
import { OrderHeader } from "@/components/orders/OrderHeader";
import { OrderStatusCard } from "@/components/orders/OrderStatusCard";
import { CustomerInfoCard } from "@/components/customers/CustomerInfoCard";
import { OrderItemsList } from "@/components/orders/OrderItemsList";
import { QuickActionsCard } from "@/components/orders/QuickActionsCard";
import { DropdownMenu } from "@/components/DropdownMenu";
import { useToast } from "@/lib/toast";
import { Alert as GSAlert, AlertText } from "@/components/ui/alert";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";

export default function OrderDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [showMarkPaidConfirm, setShowMarkPaidConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedback, setFeedback] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);
  const [markPaidLoading, setMarkPaidLoading] = useState(false);
  const toast = useToast();

  // Fetch order with related data
  const {
    data: order,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["order-details", id],
    queryFn: async (): Promise<OrderWithRelations | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          customers(*),
          order_items(*, inventory(*))
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as OrderWithRelations;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No order ID");
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.showToast("success", "Order Deleted", "Order deleted successfully");
      router.back();
    },
    onError: (error: any) => {
      toast.showToast(
        "error",
        "Delete Failed",
        error.message || "Failed to delete order"
      );
    },
  });

  // Memoized handlers
  const handleEdit = useCallback(() => {
    router.push(`/orders/${id}/edit` as any);
  }, [id]);

  const handleDelete = useCallback(() => {
    setShowMarkPaidConfirm(false); // ensure other modal closed
    setShowDeleteConfirm(true);
  }, [deleteOrderMutation]);

  const handleViewCustomer = useCallback(() => {
    if (order?.customer_id) {
      router.push(`/customers/${order.customer_id}` as any);
    }
  }, [order?.customer_id]);

  const handleCreateInvoice = useCallback(() => {
    router.push({
      pathname: "/invoices/create",
      params: { orderId: id },
    } as any);
  }, [id]);

  const toggleDropdownMenu = useCallback(() => {
    setShowDropdownMenu((prev) => !prev);
  }, []);

  const closeDropdownMenu = useCallback(() => {
    setShowDropdownMenu(false);
  }, []);

  // Derived amounts (assuming order has only total_amount; compute subtotal from items)
  const subtotal = useMemo(() => {
    return (
      order?.order_items?.reduce(
        (sum, it: any) => sum + (it.total_price || 0),
        0
      ) || 0
    );
  }, [order?.order_items]);
  // Placeholder tax & delivery until model fields exist
  const taxAmount = 0; // TODO: derive from tax fields when available
  const deliveryCharge = 0; // TODO: integrate delivery charge field
  const grandTotal =
    order?.total_amount ?? subtotal + taxAmount + deliveryCharge;

  // Memoized menu items
  const menuItems = useMemo<MenuItem[]>(
    () => [
      { icon: "edit", label: "Edit Order", onPress: handleEdit },
      {
        icon: "trash",
        label: "Delete Order",
        onPress: handleDelete,
        color: "rgb(var(--color-error-600))",
      },
    ],
    [handleEdit, handleDelete]
  );

  if (isLoading) {
    return (
      <StandardPage>
        <StandardHeader title="Order" showBackButton />
        <View className="flex-1 items-center justify-center py-20">
          <EmptyState
            icon="spinner"
            title="Loading Order"
            description="Fetching order details..."
          />
        </View>
      </StandardPage>
    );
  }

  if (!order) {
    return (
      <StandardPage>
        <StandardHeader title="Order" showBackButton />
        <View className="flex-1 items-center justify-center py-20">
          <EmptyState
            icon="shopping-cart"
            title="Order Not Found"
            description="The order you're looking for doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </View>
      </StandardPage>
    );
  }

  return (
    <StandardPage>
      <StandardHeader title={order.order_number} showBackButton />
      {feedback && (
        <GSAlert
          action={feedback.type === "success" ? "success" : "error"}
          variant="outline"
          className="mx-4 mt-4"
        >
          <AlertText className="font-semibold">{feedback.message}</AlertText>
        </GSAlert>
      )}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 gap-6"
      >
        {order.order_status !== "paid" && (
          <GSButton
            variant="solid"
            className="w-full"
            onPress={() => setShowMarkPaidConfirm(true)}
            isDisabled={markPaidLoading}
          >
            {markPaidLoading && <ButtonSpinner className="mr-2" />}
            <ButtonText>
              {markPaidLoading ? "Processing..." : "Mark Delivered"}
            </ButtonText>
          </GSButton>
        )}
        <OrderStatusCard order={order} />
        <CustomerInfoCard
          customer={order.customers}
          onViewCustomer={handleViewCustomer}
          onCall={() =>
            order.customers.phone &&
            Linking.openURL(`tel:${order.customers.phone}`)
          }
          onEmail={() =>
            order.customers.email &&
            Linking.openURL(`mailto:${order.customers.email}`)
          }
        />
        <OrderItemsList order={order} />
        <View className="bg-background-0 border border-outline-200 rounded-lg p-4 gap-2">
          <Text className="text-sm font-semibold text-typography-900 mb-1">
            Amount Summary
          </Text>
          <View className="flex-row justify-between">
            <Text className="text-xs text-typography-600">Subtotal</Text>
            <Text className="text-xs font-medium text-typography-900">
              ₹{subtotal.toLocaleString()}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-typography-600">Tax</Text>
            <Text className="text-xs font-medium text-typography-900">
              ₹{taxAmount.toLocaleString()}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-typography-600">Delivery</Text>
            <Text className="text-xs font-medium text-typography-900">
              ₹{(order.delivery_charge ?? 0).toLocaleString()}
            </Text>
          </View>
          <View className="h-px bg-outline-100 my-1" />
          <View className="flex-row justify-between">
            <Text className="text-xs font-semibold text-typography-900">
              Total
            </Text>
            <Text className="text-sm font-bold text-primary-600 dark:text-primary-500">
              ₹{grandTotal.toLocaleString()}
            </Text>
          </View>
          {grandTotal !== order.total_amount && (
            <Text className="text-[10px] text-warning-600 mt-1">
              Displayed total differs from stored order total.
            </Text>
          )}
        </View>
        <QuickActionsCard
          onCreateInvoice={handleCreateInvoice}
          onEditOrder={handleEdit}
          onViewCustomer={handleViewCustomer}
        />
      </ScrollView>
      <DropdownMenu
        visible={showDropdownMenu}
        onClose={closeDropdownMenu}
        menuItems={menuItems}
      />
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="md"
      >
        <ModalBackdrop onPress={() => setShowDeleteConfirm(false)} />
        <ModalContent>
          <ModalHeader className="mb-4">
            <Text className="text-base font-semibold text-typography-900">
              Delete Order
            </Text>
          </ModalHeader>
          <ModalBody>
            <Text className="text-sm mb-4 text-typography-700">
              Are you sure you want to delete this order? This action cannot be
              undone.
            </Text>
            <View className="flex-row justify-end gap-3">
              <GSButton
                variant="outline"
                onPress={() => setShowDeleteConfirm(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </GSButton>
              <GSButton
                variant="solid"
                action="negative"
                onPress={() => {
                  deleteOrderMutation.mutate();
                  setShowDeleteConfirm(false);
                }}
                isDisabled={deleteOrderMutation.isPending}
              >
                {deleteOrderMutation.isPending && (
                  <ButtonSpinner className="mr-2" />
                )}
                <ButtonText>
                  {deleteOrderMutation.isPending ? "Deleting..." : "Delete"}
                </ButtonText>
              </GSButton>
            </View>
          </ModalBody>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={showMarkPaidConfirm}
        onClose={() => setShowMarkPaidConfirm(false)}
        size="md"
      >
        <ModalBackdrop onPress={() => setShowMarkPaidConfirm(false)} />
        <ModalContent>
          <ModalHeader className="mb-4">
            <Text className="text-base font-semibold text-typography-900">
              Mark Order Paid
            </Text>
          </ModalHeader>
          <ModalBody>
            <Text className="text-sm mb-4 text-typography-700">
              Mark this order as paid? This will post a ledger credit (if no
              invoice exists).
            </Text>
            <View className="flex-row justify-end gap-3">
              <GSButton
                variant="outline"
                onPress={() => setShowMarkPaidConfirm(false)}
              >
                <ButtonText>Cancel</ButtonText>
              </GSButton>
              <GSButton
                variant="solid"
                onPress={async () => {
                  try {
                    setMarkPaidLoading(true);
                    const { error } = await (supabase as any)
                      .from("orders")
                      .update({
                        order_status: "paid",
                        updated_at: new Date().toISOString(),
                      } as any)
                      .eq("id", order.id);
                    if (error) throw error;
                    await queryClient.invalidateQueries({
                      queryKey: ["order-details", order.id],
                    });
                    await queryClient.invalidateQueries({
                      queryKey: ["orders"],
                    });
                    toast.showToast(
                      "success",
                      "Order Updated",
                      "Order marked paid"
                    );
                  } catch (e: any) {
                    toast.showToast(
                      "error",
                      "Update Failed",
                      e.message || "Failed to update order"
                    );
                  } finally {
                    setMarkPaidLoading(false);
                    setShowMarkPaidConfirm(false);
                  }
                }}
                isDisabled={markPaidLoading}
              >
                {markPaidLoading && <ButtonSpinner className="mr-2" />}
                <ButtonText>
                  {markPaidLoading ? "Marking..." : "Confirm"}
                </ButtonText>
              </GSButton>
            </View>
          </ModalBody>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
}
