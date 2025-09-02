import React from "react";
import {
  ScrollView,
  Alert,
  TouchableOpacity,
  Share,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  SectionHeader,
  EmptyState,
  SafeScreen,
} from "@/components/DesignSystem";
import { Card } from "@/components/ui/card";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Database } from "@/types/database.types";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import {
  generateInvoicePdf,
  writePdfToFile,
  uploadPdfToSupabase,
  sharePdf,
} from "@/lib/invoicePdf";
import { useToast } from "@/lib/toast";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

interface InvoiceWithRelations {
  id: string;
  created_at: string;
  invoice_number: string;
  customer_id: string;
  order_id: string | null;
  issue_date: string;
  due_date: string;
  status: string;
  amount: number;
  tax: number;
  notes: string | null;
  pdf_url?: string | null;
  customers: Customer;
  orders: Order | null;
}

export default function InvoiceDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [regenLoading, setRegenLoading] = React.useState(false);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [autoRegenEnabled, setAutoRegenEnabled] = React.useState(true);
  const [showDropdownMenu, setShowDropdownMenu] = React.useState(false);
  const debounceRef = React.useRef<any>(null);

  // Fetch invoice with related data
  const {
    data: invoice,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["invoice-details", id],
    queryFn: async (): Promise<InvoiceWithRelations | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customers(*),
          orders(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as InvoiceWithRelations;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No invoice ID");
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      Alert.alert("Success", "Invoice deleted successfully");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to delete invoice");
    },
  });

  const autoRegenMutation = useMutation({
    mutationFn: async (inv: InvoiceWithRelations) => {
      const pdfBytes = await generateInvoicePdf({
        invoice: inv as any,
        customer: inv.customers,
        logo: require("@/assets/images/icon.png"),
      });
      const filePath = await writePdfToFile(
        pdfBytes,
        `${inv.invoice_number}.pdf`
      );
      const { publicUrl } = await uploadPdfToSupabase(
        filePath,
        INVOICE_PDF_BUCKET
      );
      // @ts-ignore
      await supabase
        .from("invoices")
        .update({ pdf_url: publicUrl })
        .eq("id", inv.id);
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-details", id] });
    },
  });

  // Trigger auto regeneration when critical fields change
  React.useEffect(() => {
    if (!invoice || !autoRegenEnabled) return;
    const signature = [
      invoice.invoice_number,
      invoice.issue_date,
      invoice.amount,
      invoice.tax,
    ].join("|");
    if ((autoRegenMutation as any)._lastSig === signature) return;
    (autoRegenMutation as any)._lastSig = signature;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => autoRegenMutation.mutate(invoice),
      1200
    );
  }, [
    invoice?.invoice_number,
    invoice?.issue_date,
    invoice?.amount,
    invoice?.tax,
    autoRegenEnabled,
  ]);

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
          onPress: () => deleteInvoiceMutation.mutate(),
        },
      ]
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
        "Please wait while we generate the PDF"
      );

      // Fetch related customer already in invoice.customers
      const pdfBytes = await generateInvoicePdf({
        invoice: invoice as any,
        customer: invoice.customers,
        logo: require("@/assets/images/icon.png"),
      });
      const filePath = await writePdfToFile(
        pdfBytes,
        `${invoice.invoice_number}.pdf`
      );
      // Upload if not already uploaded or to refresh
      const { publicUrl } = await uploadPdfToSupabase(filePath, "invoices");
      // Update invoice with pdf_url if changed
      if (!invoice.pdf_url || invoice.pdf_url !== publicUrl) {
        // @ts-ignore
        await supabase
          .from("invoices")
          .update({ pdf_url: publicUrl as string })
          .eq("id", invoice.id);
        queryClient.invalidateQueries({ queryKey: ["invoice-details", id] });
      }

      toast.showSuccess("PDF Ready", "Sharing invoice PDF");

      await sharePdf(filePath);
    } catch (error: any) {
      toast.showError(
        "Share Error",
        error.message || "Failed to generate/share PDF"
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
      const pdfBytes = await generateInvoicePdf({
        invoice: invoice as any,
        customer: invoice.customers,
        logo: require("@/assets/images/icon.png"),
      });
      const filePath = await writePdfToFile(
        pdfBytes,
        `${invoice.invoice_number}.pdf`
      );
      const { publicUrl } = await uploadPdfToSupabase(
        filePath,
        INVOICE_PDF_BUCKET
      );
      // @ts-ignore
      await supabase
        .from("invoices")
        .update({ pdf_url: publicUrl as string })
        .eq("id", invoice.id);
      queryClient.invalidateQueries({ queryKey: ["invoice-details", id] });
      toast.showSuccess("PDF Updated");
    } catch (e: any) {
      toast.showError("PDF Error", e.message);
    } finally {
      setRegenLoading(false);
    }
  };

  const isOverdue =
    invoice &&
    new Date(invoice.due_date) < new Date() &&
    invoice.status !== "paid";

  if (isLoading) {
    return (
      <SafeScreen>
        <Header title="Invoice Details" onBack={() => router.back()} />
        <VStack className="flex-1 justify-center items-center">
          <EmptyState
            icon="spinner"
            title="Loading Invoice"
            description="Fetching invoice details..."
          />
        </VStack>
      </SafeScreen>
    );
  }

  if (!invoice) {
    return (
      <SafeScreen>
        <Header title="Invoice Not Found" onBack={() => router.back()} />
        <VStack className="flex-1 justify-center items-center">
          <EmptyState
            icon="file-text"
            title="Invoice Not Found"
            description="The invoice you're looking for doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </VStack>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <Header
        title={
          invoice.invoice_number.length > 25
            ? `${invoice.invoice_number.substring(0, 25)}...`
            : invoice.invoice_number
        }
        subtitle={
          invoice.invoice_number.length > 25
            ? `Full ID: ${invoice.invoice_number}`
            : `Invoice #${invoice.invoice_number}`
        }
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => setShowDropdownMenu(true)}
            className="p-2 rounded-md bg-gray-100"
          >
            <FontAwesome
              name="ellipsis-v"
              size={16}
              color="rgb(var(--color-gray-600))"
            />
          </TouchableOpacity>
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
                    const date = new Date(dateStr);
                    return isNaN(date.getTime())
                      ? "Invalid date"
                      : date.toLocaleDateString();
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
                  {new Date(invoice.due_date).toLocaleDateString()}
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
                  ₹{(invoice.amount + invoice.tax).toLocaleString()}
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
                ₹{(invoice.orders?.delivery_charge ?? 0).toLocaleString()}
              </Text>
            </HStack>

            <HStack className="border-t border-gray-200 pt-3 justify-between">
              <Text className="text-base font-semibold text-gray-900">
                Total
              </Text>
              <Text className="text-base font-bold text-primary-600">
                ₹{(invoice.orders?.total_amount ?? 0).toLocaleString()}
              </Text>
            </HStack>
          </VStack>
        </Card>

        {/* Customer Information */}
        <Card variant="elevated" className="p-4 mb-6">
          <SectionHeader
            title="Customer Information"
            rightElement={
              <Button onPress={handleViewCustomer} variant="ghost" size="sm">
                <HStack className="items-center gap-1">
                  <Text className="text-sm">View Details</Text>
                  <FontAwesome name="external-link" size={12} />
                </HStack>
              </Button>
            }
          />

          <TouchableOpacity
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
          </TouchableOpacity>
        </Card>

        {/* Enhanced Related Order */}
        {invoice.orders && (
          <Card variant="elevated" size="sm" className="mb-6">
            <SectionHeader
              title="Related Order"
              rightElement={
                <Button onPress={handleViewOrder} variant="ghost" size="sm">
                  <HStack className="items-center gap-1">
                    <Text className="text-sm">View Order</Text>
                    <FontAwesome name="external-link" size={12} />
                  </HStack>
                </Button>
              }
            />

            <TouchableOpacity
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
                  {new Date(invoice.orders.order_date).toLocaleDateString()}
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
            </TouchableOpacity>

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
                      {new Date(invoice.orders.order_date).toLocaleDateString()}
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
                      ₹{(invoice.orders.total_amount || 0).toLocaleString()}
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
                  <ButtonIcon>
                    <FontAwesome name="share" size={16} />
                  </ButtonIcon>
                  <ButtonText>Share</ButtonText>
                </Button>
              </VStack>
              <VStack className="flex-1">
                <Button onPress={handleEdit} variant="outline">
                  <ButtonIcon>
                    <FontAwesome name="edit" size={16} />
                  </ButtonIcon>
                  <ButtonText>Edit Invoice</ButtonText>
                </Button>
              </VStack>
            </HStack>

            <Button
              onPress={handleDelete}
              action="negative"
              disabled={deleteInvoiceMutation.isPending}
            >
              <ButtonIcon>
                <FontAwesome name="trash" size={16} />
              </ButtonIcon>
              <ButtonText>Delete Invoice</ButtonText>
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
              <ButtonIcon>
                <FontAwesome name="refresh" size={16} />
              </ButtonIcon>
              <ButtonText>Regenerate PDF</ButtonText>
            </Button>
            {autoRegenMutation.isPending && (
              <Badge size="sm" variant="solid" action="secondary">
                <BadgeText>Updating PDF</BadgeText>
              </Badge>
            )}
          </HStack>
        </Card>
      </ScrollView>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showDropdownMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdownMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowDropdownMenu(false)}
        >
          <VStack className="bg-white m-4 rounded-xl p-4 shadow-lg">
            <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Invoice Actions
            </Text>

            <TouchableOpacity
              className="flex-row items-center p-3 mb-2"
              onPress={() => {
                setShowDropdownMenu(false);
                handleShare();
              }}
            >
              <FontAwesome
                name="share"
                size={20}
                color="rgb(var(--color-primary-600))"
              />
              <Text className="text-base ml-3 text-gray-900">
                Share Invoice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-3 mb-2"
              onPress={() => {
                setShowDropdownMenu(false);
                handleEdit();
              }}
            >
              <FontAwesome
                name="edit"
                size={20}
                color="rgb(var(--color-primary-600))"
              />
              <Text className="text-base ml-3 text-gray-900">Edit Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-3 mb-2"
              onPress={() => {
                setShowDropdownMenu(false);
                setAutoRegenEnabled((v) => !v);
              }}
            >
              <FontAwesome
                name={autoRegenEnabled ? "toggle-on" : "toggle-off"}
                size={20}
                color={
                  autoRegenEnabled
                    ? "rgb(var(--color-primary-600))"
                    : "rgb(var(--color-gray-500))"
                }
              />
              <Text className="text-base ml-3 text-gray-900">
                Auto Regenerate PDF: {autoRegenEnabled ? "On" : "Off"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-3 mt-2 border-t border-gray-200"
              onPress={() => setShowDropdownMenu(false)}
            >
              <FontAwesome
                name="times"
                size={20}
                color="rgb(var(--color-gray-500))"
              />
              <Text className="text-base ml-3 text-gray-600">Cancel</Text>
            </TouchableOpacity>
          </VStack>
        </TouchableOpacity>
      </Modal>
    </SafeScreen>
  );
}
