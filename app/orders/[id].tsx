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
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { Buffer } from "buffer";

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
  const [shareLoading, setShareLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

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
  // Generate invoice number (reuse logic similar to invoice create page)
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const time =
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0");
    return `INV${year}${month}${day}-${time}`;
  };
  const handleCreateAndShareInvoice = useCallback(async () => {
    if (!order) return;
    try {
      setShareLoading(true);
      // 1. Create invoice row in DB if not already existing for this order
      // Check existing invoice
      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();

      let invoiceRecord = existingInvoice;
      if (!invoiceRecord) {
        const now = new Date();
        const invoice_number = generateInvoiceNumber();
        const insertPayload: any = {
          invoice_number,
          order_id: order.id,
          customer_id: order.customer_id,
          issue_date: now.toISOString().split("T")[0],
          due_date: now.toISOString().split("T")[0],
          amount: order.subtotal || 0,
          tax: order.total_tax || 0,
          delivery_charge: order.delivery_charge || 0,
          pdf_url: "", // placeholder until PDF generated & uploaded
        };
        const { data: created, error: createErr } = await supabase
          .from("invoices")
          .insert(insertPayload)
          .select()
          .single();
        if (createErr) throw createErr;
        invoiceRecord = created;
      }
      // Helper to produce a safe filename from invoice number
      const makeSafeFileName = (num?: string | null) => {
        const base = (num || "invoice").replace(/[^A-Za-z0-9-_]/g, "_");
        return `${base}.pdf`;
      };

      // If invoice already has pdf_url stored, attempt to share directly
      if (invoiceRecord && (invoiceRecord as any).pdf_url) {
        const pdfUrl = (invoiceRecord as any).pdf_url as string;
        // Simple share by downloading then invoking share sheet
        try {
          const fileNameFromUrl = pdfUrl.split("/").pop() || "invoice.pdf";
          const tempPath = `${FileSystem.cacheDirectory}${fileNameFromUrl}`;
          const download = await FileSystem.downloadAsync(pdfUrl, tempPath);
          if (download.status !== 200) throw new Error("Download failed");
          const desiredName = makeSafeFileName(
            (invoiceRecord as any).invoice_number
          );
          const desiredPath = `${FileSystem.cacheDirectory}${desiredName}`;
          if (desiredPath !== tempPath) {
            try {
              await FileSystem.moveAsync({ from: tempPath, to: desiredPath });
            } catch {
              // ignore move failure
            }
          }
          const sharePath = (await FileSystem.getInfoAsync(desiredPath)).exists
            ? desiredPath
            : tempPath;
          const available = await Sharing.isAvailableAsync();
          if (!available) {
            toast.showToast(
              "error",
              "Sharing Unavailable",
              "Sharing not supported on this device"
            );
          } else {
            await Sharing.shareAsync(sharePath, {
              mimeType: "application/pdf",
              dialogTitle: "Share Invoice PDF",
              UTI: "com.adobe.pdf",
            });
          }
          toast.showToast("success", "Invoice Ready", "Existing PDF shared");
          return;
        } catch (e: any) {
          // fall through to regenerating
          console.warn(
            "Existing invoice pdf_url share failed, regenerating",
            e
          );
        }
      }

      // Generate fresh PDF
      const pdfBytes = await generateInvoicePdf({
        invoice: invoiceRecord as any,
        customer: order.customers as any,
        orderItems: (order.order_items || []).map((oi: any) => ({
          item_name: oi.item_name || oi.inventory?.name,
          quantity: oi.quantity,
          unit_price: oi.unit_price,
          gst_percent: oi.gst_percent,
          total_price: oi.total_price,
          tax_amount: oi.tax_amount,
          hsn: oi.inventory?.hsn || "",
        })),
      });
      if (!invoiceRecord)
        throw new Error("Invoice record missing after create");
      const inv: any = invoiceRecord;
      const fileName = makeSafeFileName(inv.invoice_number);
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        Buffer.from(pdfBytes).toString("base64"),
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );

      // Share
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        toast.showToast(
          "error",
          "Sharing Unavailable",
          "Sharing not supported on this device"
        );
      } else {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Invoice PDF",
          UTI: "com.adobe.pdf",
        });
        toast.showToast("success", "Invoice Ready", "PDF shared");
      }
    } catch (e: any) {
      toast.showToast(
        "error",
        "Share Failed",
        e.message || "Could not share invoice"
      );
    } finally {
      setShareLoading(false);
    }
  }, [order, supabase, toast]);

  const handleRegenerateInvoice = useCallback(async () => {
    if (!order) return;
    try {
      setRegenLoading(true);
      // Fetch existing invoice for this order
      const { data: existingInvoice, error: fetchErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!existingInvoice) {
        toast.showToast(
          "error",
          "No Invoice",
          "Create the invoice first before regenerating"
        );
        return;
      }
      // Generate new PDF
      const pdfBytes = await generateInvoicePdf({
        invoice: existingInvoice as any,
        customer: order.customers as any,
        orderItems: (order.order_items || []).map((oi: any) => ({
          item_name: oi.item_name || oi.inventory?.name,
          quantity: oi.quantity,
          unit_price: oi.unit_price,
          gst_percent: oi.gst_percent,
          total_price: oi.total_price,
          tax_amount: oi.tax_amount,
          hsn: oi.inventory?.hsn || "",
        })),
      });
      const makeSafeFileName = (num?: string | null) =>
        `${(num || "invoice").replace(/[^A-Za-z0-9-_]/g, "_")}.pdf`;
      const fileName = makeSafeFileName(
        (existingInvoice as any).invoice_number
      );
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        Buffer.from(pdfBytes).toString("base64"),
        { encoding: FileSystem.EncodingType.Base64 }
      );
      // (Optional) Could upload & update pdf_url here similar to details page logic
      toast.showToast(
        "success",
        "PDF Ready",
        "Invoice PDF regenerated locally"
      );
    } catch (e: any) {
      toast.showToast(
        "error",
        "Regenerate Failed",
        e.message || "Failed to regenerate invoice"
      );
    } finally {
      setRegenLoading(false);
    }
  }, [order, supabase, toast]);

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

            {markPaidLoading ? (
              <ButtonSpinner />
            ) : (
              <ButtonText>Mark Paid</ButtonText>
            )}
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
          onCreateAndShareInvoice={handleCreateAndShareInvoice}
          createShareLoading={shareLoading}
          onRegenerateInvoice={handleRegenerateInvoice}
          regenerateLoading={regenLoading}
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
