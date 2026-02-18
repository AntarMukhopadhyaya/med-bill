import React from "react";
import { ScrollView, Alert, Modal } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Card } from "@/components/ui/card";
import {
  Button,
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
} from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Database } from "@/types/database.types";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import { generateAndUploadInvoicePdf, sharePdf } from "@/lib/invoicePdf";
import { useToast } from "@/lib/toast";
import { Pressable } from "@/components/ui/pressable";
import {
  StandardHeader,
  StandardPage,
  SectionHeader,
} from "@/components/layout";
import { EmptyState } from "@/components/EmptyState";
import {
  CircleIcon,
  EditIcon,
  MenuIcon,
  ShareIcon,
  TrashIcon,
} from "@/components/ui/icon";
import { InvoiceWithRelations } from "@/types/invoice";
import {
  useInvoiceDetails,
  useInvoiceDeleteMutation,
} from "@/hooks/useInvoices";
import { updateInvoicePdfUrl } from "@/services/invoice.service";
import { formatDate } from "@/lib/date";
export default function InvoiceDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [regenLoading, setRegenLoading] = React.useState(false);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = React.useState(false);

  const { data: invoice, isLoading, refetch } = useInvoiceDetails(id);

  const deleteInvoiceMutation = useInvoiceDeleteMutation();

  const handleEdit = () => {
    router.push(`/invoices/${id}/edit` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Invoice",
      "Are you sure you want to delete this invoice? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteInvoiceMutation.mutate(id as string, {
              onSuccess: () => {
                Alert.alert("Success", "Invoice deleted successfully");
                router.back();
              },
              onError: (error: any) => {
                Alert.alert(
                  "Error",
                  error?.message || "Failed to delete invoice",
                );
              },
            }),
        },
      ],
    );
  };

  const handleViewCustomer = () => {
    if (invoice?.customer_id) {
      router.push(`/customers/${invoice.customer_id}` as any);
    }
  };

  const handleViewOrder = () => {
    if (invoice?.order_id) {
      router.push(`/orders/${invoice.order_id}` as any);
    }
  };

  const handleShare = async () => {
    if (!invoice) return;

    try {
      setShareLoading(true);
      toast.showInfo(
        "Preparing PDF...",
        "Please wait while we generate the PDF",
      );

      const { filePath, publicUrl } = await generateAndUploadInvoicePdf({
        invoice: invoice as any,
        customer: invoice.customers,
        logo: require("@/assets/images/icon.png"),
        filename: `${invoice.invoice_number}.pdf`,
        bucket: INVOICE_PDF_BUCKET,
      });

      if (publicUrl && (!invoice.pdf_url || invoice.pdf_url !== publicUrl)) {
        await updateInvoicePdfUrl(invoice.id, publicUrl);
        refetch();
      }

      toast.showSuccess("PDF Ready", "Sharing invoice PDF");

      await sharePdf(filePath);
    } catch (error: any) {
      toast.showError(
        "Share Error",
        error.message || "Failed to generate/share PDF",
      );
    } finally {
      setShareLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!invoice) return;
    try {
      setRegenLoading(true);
      toast.showInfo("Regenerating PDF", "Please wait");
      const { publicUrl } = await generateAndUploadInvoicePdf({
        invoice: invoice as any,
        customer: invoice.customers,
        logo: require("@/assets/images/icon.png"),
        filename: `${invoice.invoice_number}.pdf`,
        bucket: INVOICE_PDF_BUCKET,
      });

      if (publicUrl) {
        await updateInvoicePdfUrl(invoice.id, publicUrl);
      }
      refetch();
      toast.showSuccess("PDF Updated");
    } catch (e: any) {
      toast.showError("PDF Error", e.message);
    } finally {
      setRegenLoading(false);
    }
  };

  // Overdue concept deprecated with removal of status column; compute purely by due_date if needed
  const isOverdue = false;

  if (isLoading) {
    return (
      <StandardPage>
        <StandardHeader title="Invoice Details" showBackButton />
        <VStack className="flex-1 justify-center items-center px-6">
          <EmptyState
            icon="spinner"
            title="Loading Invoice"
            description="Fetching invoice details..."
          />
        </VStack>
      </StandardPage>
    );
  }

  if (!invoice) {
    return (
      <StandardPage>
        <StandardHeader title="Invoice Not Found" showBackButton />
        <VStack className="flex-1 justify-center items-center px-6">
          <EmptyState
            icon="file-text"
            title="Invoice Not Found"
            description="The invoice you're looking for doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </VStack>
      </StandardPage>
    );
  }

  return (
    <StandardPage>
      <StandardHeader
        title={
          invoice.invoice_number.length > 9
            ? `${invoice.invoice_number.substring(0, 9)}...`
            : invoice.invoice_number
        }
        subtitle={
          invoice.invoice_number.length > 25
            ? `Full ID: ${invoice.invoice_number}`
            : `Invoice #${invoice.invoice_number}`
        }
        onBack={() => router.back()}
        showBackButton={true}
        rightElement={
          <Button
            size="sm"
            onPress={() => setShowDropdownMenu(true)}
            className="h-auto px-2 py-2"
          >
            <ButtonIcon as={MenuIcon}></ButtonIcon>
          </Button>
        }
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Invoice Status Card */}
        <Card variant="elevated" className="p-6 mb-6">
          <VStack className="gap-3">
            <HStack className="items-center gap-3">
              <FontAwesome
                name="calendar"
                size={16}
                color="rgb(var(--color-gray-500))"
              />
              <VStack className="flex-1">
                <Text className="text-xs text-gray-600">Invoice Date</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {(() => {
                    const dateStr = invoice.issue_date;
                    if (!dateStr) return "No date set";
                    const formatted = formatDate(dateStr);
                    return formatted ? formatted : "Invalid date";
                  })()}
                </Text>
              </VStack>
            </HStack>

            <HStack className="items-center gap-3">
              <FontAwesome
                name="clock-o"
                size={16}
                color={
                  isOverdue
                    ? "rgb(var(--color-error-500))"
                    : "rgb(var(--color-gray-500))"
                }
              />
              <VStack className="flex-1">
                <Text className="text-xs text-gray-600">Due Date</Text>
                <Text
                  className={`text-sm font-semibold ${
                    isOverdue ? "text-error-600" : "text-gray-900"
                  }`}
                >
                  {formatDate(invoice.due_date)}
                </Text>
              </VStack>
            </HStack>

            <HStack className="items-center gap-3">
              <FontAwesome
                name="money"
                size={16}
                color="rgb(var(--color-gray-500))"
              />
              <VStack className="flex-1">
                <Text className="text-xs text-gray-600">Total Amount</Text>
                <Text className="text-lg font-bold text-primary-600">
                  ₹
                  {(
                    (invoice.amount || 0) +
                    (invoice.tax || 0) +
                    (invoice.delivery_charge || 0)
                  ).toLocaleString()}
                </Text>
              </VStack>
            </HStack>

            {invoice.notes && (
              <HStack className="items-start gap-3">
                <FontAwesome
                  name="sticky-note"
                  size={16}
                  color="rgb(var(--color-gray-500))"
                  style={{ marginTop: 2 }}
                />
                <VStack className="flex-1">
                  <Text className="text-xs text-gray-600">Notes</Text>
                  <Text className="text-sm text-gray-900 leading-5">
                    {invoice.notes}
                  </Text>
                </VStack>
              </HStack>
            )}
          </VStack>
        </Card>

        {/* Amount Breakdown */}
        <Card variant="elevated" className="p-6 mb-6">
          <SectionHeader title="Amount Breakdown" />

          <VStack className="gap-3">
            <HStack className="justify-between">
              <Text className="text-sm text-gray-600">Subtotal</Text>
              <Text className="text-sm font-semibold text-gray-900">
                ₹{invoice.amount.toLocaleString()}
              </Text>
            </HStack>

            <HStack className="justify-between">
              <Text className="text-sm text-gray-600">Tax</Text>
              <Text className="text-sm font-semibold text-gray-900">
                ₹{invoice.tax.toLocaleString()}
              </Text>
            </HStack>

            <HStack className="justify-between">
              <Text className="text-sm text-gray-600">Delivery Charge</Text>
              <Text className="text-sm font-semibold text-gray-900">
                ₹{(invoice.delivery_charge ?? 0).toLocaleString()}
              </Text>
            </HStack>

            <HStack className="border-t border-gray-200 pt-3 justify-between">
              <Text className="text-base font-semibold text-gray-900">
                Total
              </Text>
              <Text className="text-base font-bold text-primary-600">
                ₹
                {(
                  (invoice.amount || 0) +
                  (invoice.tax || 0) +
                  (invoice.delivery_charge || 0)
                ).toLocaleString()}
              </Text>
            </HStack>
          </VStack>
        </Card>

        {/* Customer Information */}
        <Card variant="elevated" className="p-4 mb-6">
          <SectionHeader
            title="Customer Information"
            rightElement={
              <Button onPress={handleViewCustomer} size="sm">
                <HStack className="items-center gap-1">
                  <ButtonText className="text-sm">View Details</ButtonText>
                  <FontAwesome name="external-link" size={12} />
                </HStack>
              </Button>
            }
          />

          <Pressable
            onPress={handleViewCustomer}
            className="flex-row items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <FontAwesome
              name="user"
              size={20}
              color="rgb(var(--color-primary-500))"
            />
            <VStack className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {invoice.customers.name}
              </Text>
              {invoice.customers.company_name && (
                <Text className="text-sm text-gray-600">
                  {invoice.customers.company_name}
                </Text>
              )}
              <Text className="text-sm text-gray-600">
                {invoice.customers.phone}
              </Text>
            </VStack>
            <FontAwesome
              name="chevron-right"
              size={14}
              color="rgb(var(--color-gray-400))"
            />
          </Pressable>
        </Card>

        {/* Enhanced Related Order */}
        {invoice.orders && (
          <Card variant="elevated" size="sm" className="mb-6">
            <SectionHeader
              title="Related Order"
              rightElement={
                <Button onPress={handleViewOrder} size="sm">
                  <HStack className="items-center gap-1">
                    <ButtonText className="text-sm">View Order</ButtonText>
                    <FontAwesome name="external-link" size={12} />
                  </HStack>
                </Button>
              }
            />

            <Pressable
              onPress={handleViewOrder}
              className="flex-row items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4"
            >
              <FontAwesome
                name="shopping-cart"
                size={20}
                color="rgb(var(--color-primary-500))"
              />
              <VStack className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {invoice.orders.order_number}
                </Text>
                <Text className="text-sm text-gray-600">
                  {formatDate(invoice.orders.order_date)}
                </Text>
                <Badge
                  variant={
                    invoice.orders.order_status === "paid" ? "solid" : "outline"
                  }
                  size="sm"
                >
                  <BadgeText className="capitalize">
                    {invoice.orders.order_status}
                  </BadgeText>
                </Badge>
              </VStack>
              <FontAwesome
                name="chevron-right"
                size={14}
                color="rgb(var(--color-gray-400))"
              />
            </Pressable>

            {/* Enhanced Order Details */}
            <VStack className="gap-4">
              <VStack className="gap-2">
                <Text className="text-sm font-medium text-gray-700">
                  Order Summary
                </Text>
                <VStack className="bg-gray-50 p-3 rounded-lg gap-2">
                  <HStack className="justify-between">
                    <Text className="text-xs text-gray-600">Order Date:</Text>
                    <Text className="text-xs font-medium text-gray-900">
                      {formatDate(invoice.orders.order_date)}
                    </Text>
                  </HStack>

                  {/* Remove expected_delivery_date for now since it's not in the type */}

                  <HStack className="justify-between">
                    <Text className="text-xs text-gray-600">Status:</Text>
                    <Badge variant="outline" size="sm">
                      <BadgeText className="capitalize text-xs">
                        {invoice.orders.order_status}
                      </BadgeText>
                    </Badge>
                  </HStack>
                </VStack>
              </VStack>

              {/* Financial Details */}
              <VStack className="gap-2">
                <Text className="text-sm font-medium text-gray-700">
                  Financial Details
                </Text>
                <VStack className="bg-gray-50 p-3 rounded-lg gap-2">
                  <HStack className="justify-between">
                    <Text className="text-xs text-gray-600">Subtotal:</Text>
                    <Text className="text-xs font-semibold text-gray-900">
                      ₹{(invoice.orders.subtotal || 0).toLocaleString()}
                    </Text>
                  </HStack>

                  <HStack className="justify-between">
                    <Text className="text-xs text-gray-600">Tax:</Text>
                    <Text className="text-xs font-semibold text-gray-900">
                      ₹{(invoice.orders.total_tax || 0).toLocaleString()}
                    </Text>
                  </HStack>

                  <HStack className="justify-between">
                    <Text className="text-xs text-gray-600">
                      Delivery Charge:
                    </Text>
                    <Text className="text-xs font-semibold text-gray-900">
                      ₹{(invoice.orders.delivery_charge || 0).toLocaleString()}
                    </Text>
                  </HStack>

                  <HStack className="justify-between border-t border-gray-200 pt-2">
                    <Text className="text-sm font-semibold text-gray-800">
                      Total:
                    </Text>
                    <Text className="text-sm font-bold text-primary-600">
                      ₹
                      {(
                        (invoice.orders.subtotal || 0) +
                        (invoice.orders.total_tax || 0) +
                        (invoice.orders.delivery_charge || 0)
                      ).toLocaleString()}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>

              {/* Additional Order Information */}
              {invoice.orders.notes && (
                <VStack className="gap-2">
                  <Text className="text-sm font-medium text-gray-700">
                    Additional Information
                  </Text>
                  <VStack className="bg-gray-50 p-3 rounded-lg gap-2">
                    <VStack>
                      <Text className="text-xs font-medium text-gray-600">
                        Notes:
                      </Text>
                      <Text className="text-xs text-gray-900 leading-4">
                        {invoice.orders.notes}
                      </Text>
                    </VStack>
                  </VStack>
                </VStack>
              )}
            </VStack>
          </Card>
        )}

        {/* Quick Actions */}
        <Card variant="elevated" className="p-6 mb-6">
          <SectionHeader title="Quick Actions" />

          <VStack className="gap-3">
            <HStack className="gap-3">
              <VStack className="flex-1">
                <Button
                  onPress={handleShare}
                  variant="outline"
                  disabled={shareLoading}
                >
                  {shareLoading ? (
                    <ButtonSpinner />
                  ) : (
                    <>
                      <ButtonIcon as={ShareIcon} />

                      <ButtonText>Share</ButtonText>
                    </>
                  )}
                </Button>
              </VStack>
              <VStack className="flex-1">
                <Button onPress={handleEdit} variant="outline">
                  <ButtonIcon as={EditIcon} />
                  <ButtonText>Edit </ButtonText>
                </Button>
              </VStack>
            </HStack>

            <Button
              onPress={handleDelete}
              action="negative"
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? (
                <ButtonSpinner />
              ) : (
                <>
                  <ButtonIcon as={TrashIcon} />
                  <ButtonText>Delete</ButtonText>
                </>
              )}
            </Button>
          </VStack>
        </Card>

        {/* Regenerate PDF Button */}
        <Card variant="elevated" className="p-6 mb-6">
          <SectionHeader title="Regenerate PDF" />

          <HStack className="items-center gap-3">
            <Button
              onPress={handleRegenerate}
              variant="outline"
              disabled={regenLoading}
            >
              {regenLoading ? (
                <ButtonSpinner />
              ) : (
                <>
                  <ButtonIcon as={CircleIcon} />
                  <ButtonText>Regenerate PDF</ButtonText>
                </>
              )}
            </Button>
          </HStack>
        </Card>
      </ScrollView>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showDropdownMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdownMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowDropdownMenu(false)}
        >
          <VStack className="bg-background-0 m-4 rounded-xl p-4 shadow-lg border border-outline-200">
            <Text className="text-lg font-semibold text-typography-900 mb-4 text-center">
              Invoice Actions
            </Text>
            <Pressable
              className="flex-row items-center p-3 mb-2 rounded-md bg-background-50"
              onPress={() => {
                setShowDropdownMenu(false);
                handleShare();
              }}
            >
              <FontAwesome name="share" size={20} color="#2563eb" />
              <Text className="text-base ml-3 text-typography-900">
                Share Invoice
              </Text>
            </Pressable>
            <Pressable
              className="flex-row items-center p-3 mb-2 rounded-md bg-background-50"
              onPress={() => {
                setShowDropdownMenu(false);
                handleEdit();
              }}
            >
              <FontAwesome name="edit" size={20} color="#2563eb" />
              <Text className="text-base ml-3 text-typography-900">
                Edit Invoice
              </Text>
            </Pressable>
            <Pressable
              className="flex-row items-center p-3 mb-2 rounded-md bg-background-50"
              onPress={() => {
                setShowDropdownMenu(false);
              }}
            >
              <FontAwesome name="file-pdf-o" size={20} color="#2563eb" />
              <Text className="text-base ml-3 text-typography-900">
                Regenerate PDF
              </Text>
            </Pressable>
            <Pressable
              className="flex-row items-center p-3 mt-2 border-t border-outline-200"
              onPress={() => setShowDropdownMenu(false)}
            >
              <FontAwesome name="times" size={20} color="#6b7280" />
              <Text className="text-base ml-3 text-typography-600">Cancel</Text>
            </Pressable>
          </VStack>
        </Pressable>
      </Modal>
    </StandardPage>
  );
}
