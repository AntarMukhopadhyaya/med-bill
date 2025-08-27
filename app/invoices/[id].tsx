import React from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Share,
  SafeAreaView,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Header,
  Card,
  Button,
  Badge,
  SectionHeader,
  EmptyState,
  colors,
  spacing,
  SafeScreen,
} from "@/components/DesignSystem";
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

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!id) throw new Error("No invoice ID");
      const { data, error } = await supabase
        .from("invoices")
        // cast to any to bypass generated types mismatch until types regenerated
        // @ts-ignore
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-details", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      Alert.alert("Success", "Invoice status updated successfully");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update invoice status");
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

  const handleMarkAsPaid = () => {
    Alert.alert(
      "Mark as Paid",
      "Are you sure you want to mark this invoice as paid?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Paid",
          onPress: () => updateStatusMutation.mutate("paid"),
        },
      ]
    );
  };

  const handleMarkAsSent = () => {
    updateStatusMutation.mutate("sent");
  };

  const handleShare = async () => {
    if (!invoice) return;

    try {
      setShareLoading(true);
      toast.showToast({
        type: "info",
        title: "Preparing PDF...",
        message: "Please wait while we generate the PDF",
      });

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

      toast.showToast({
        type: "success",
        title: "PDF Ready",
        message: "Sharing invoice PDF",
      });

      await sharePdf(filePath);
    } catch (error: any) {
      toast.showToast({
        type: "error",
        title: "Share Error",
        message: error.message || "Failed to generate/share PDF",
      });
    } finally {
      setShareLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!invoice) return;
    try {
      setRegenLoading(true);
      toast.showToast({
        type: "info",
        title: "Regenerating PDF",
        message: "Please wait",
      });
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
      toast.showToast({ type: "success", title: "PDF Updated" });
    } catch (e: any) {
      toast.showToast({
        type: "error",
        title: "PDF Error",
        message: e.message,
      });
    } finally {
      setRegenLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return colors.gray[500];
      case "sent":
        return colors.primary[500];
      case "paid":
        return colors.success[500];
      case "overdue":
        return colors.error[500];
      case "cancelled":
        return colors.error[500];
      default:
        return colors.gray[500];
    }
  };

  const getStatusVariant = (
    status: string
  ): "primary" | "warning" | "error" | "secondary" | undefined => {
    switch (status.toLowerCase()) {
      case "draft":
        return "secondary";
      case "sent":
        return "primary";
      case "paid":
        return "primary";
      case "overdue":
        return "error";
      case "cancelled":
        return "error";
      default:
        return "secondary";
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
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="spinner"
            title="Loading Invoice"
            description="Fetching invoice details..."
          />
        </View>
      </SafeScreen>
    );
  }

  if (!invoice) {
    return (
      <SafeScreen>
        <Header title="Invoice Not Found" onBack={() => router.back()} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <EmptyState
            icon="file-text"
            title="Invoice Not Found"
            description="The invoice you're looking for doesn't exist."
            actionLabel="Go Back"
            onAction={() => router.back()}
          />
        </View>
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
            style={{
              padding: spacing[2],
              borderRadius: 6,
              backgroundColor: colors.gray[100],
            }}
          >
            <FontAwesome name="ellipsis-v" size={16} color={colors.gray[600]} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6] }}
      >
        {/* Invoice Status Card */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing[4],
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.gray[900],
              }}
            >
              Invoice Status
            </Text>
            <Badge
              label={isOverdue ? "Overdue" : invoice.status}
              variant={isOverdue ? "error" : getStatusVariant(invoice.status)}
            />
          </View>

          <View style={{ gap: spacing[3] }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <FontAwesome name="calendar" size={16} color={colors.gray[500]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  Invoice Date
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.gray[900],
                  }}
                >
                  {(() => {
                    const dateStr = invoice.issue_date;
                    if (!dateStr) return "No date set";
                    const date = new Date(dateStr);
                    return isNaN(date.getTime())
                      ? "Invalid date"
                      : date.toLocaleDateString();
                  })()}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <FontAwesome
                name="clock-o"
                size={16}
                color={isOverdue ? colors.error[500] : colors.gray[500]}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  Due Date
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isOverdue ? colors.error[600] : colors.gray[900],
                  }}
                >
                  {new Date(invoice.due_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <FontAwesome name="money" size={16} color={colors.gray[500]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                  Total Amount
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.primary[600],
                  }}
                >
                  ₹{(invoice.amount + invoice.tax).toLocaleString()}
                </Text>
              </View>
            </View>

            {invoice.notes && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: spacing[3],
                }}
              >
                <FontAwesome
                  name="sticky-note"
                  size={16}
                  color={colors.gray[500]}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.gray[600] }}>
                    Notes
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.gray[900],
                      lineHeight: 20,
                    }}
                  >
                    {invoice.notes}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Amount Breakdown */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader title="Amount Breakdown" />

          <View style={{ gap: spacing[3] }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                Subtotal
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                ₹{invoice.amount.toLocaleString()}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>Tax</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                ₹{invoice.tax.toLocaleString()}
              </Text>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.gray[200],
                paddingTop: spacing[3],
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                Total
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.primary[600],
                }}
              >
                ₹{(invoice.amount + invoice.tax).toLocaleString()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Customer Information */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader
            title="Customer Information"
            rightElement={
              <Button
                title="View Details"
                onPress={handleViewCustomer}
                variant="ghost"
                size="sm"
                icon="external-link"
              />
            }
          />

          <TouchableOpacity
            onPress={handleViewCustomer}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
              padding: spacing[3],
              backgroundColor: colors.gray[50],
              borderRadius: 8,
            }}
          >
            <FontAwesome name="user" size={20} color={colors.primary[500]} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.gray[900],
                }}
              >
                {invoice.customers.name}
              </Text>
              {invoice.customers.company_name && (
                <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                  {invoice.customers.company_name}
                </Text>
              )}
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                {invoice.customers.phone}
              </Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
        </Card>

        {/* Related Order */}
        {invoice.orders && (
          <Card
            variant="elevated"
            padding={6}
            style={{ marginBottom: spacing[6] }}
          >
            <SectionHeader
              title="Related Order"
              rightElement={
                <Button
                  title="View Order"
                  onPress={handleViewOrder}
                  variant="ghost"
                  size="sm"
                  icon="external-link"
                />
              }
            />

            <TouchableOpacity
              onPress={handleViewOrder}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[3],
                backgroundColor: colors.gray[50],
                borderRadius: 8,
              }}
            >
              <FontAwesome
                name="shopping-cart"
                size={20}
                color={colors.primary[500]}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.gray[900],
                  }}
                >
                  {invoice.orders.order_number}
                </Text>
                <Text style={{ fontSize: 14, color: colors.gray[600] }}>
                  {new Date(invoice.orders.order_date).toLocaleDateString()}
                </Text>
                <Badge
                  label={invoice.orders.order_status}
                  variant={
                    invoice.orders.order_status === "delivered"
                      ? "primary"
                      : "warning"
                  }
                  size="sm"
                />
              </View>
              <FontAwesome
                name="chevron-right"
                size={14}
                color={colors.gray[400]}
              />
            </TouchableOpacity>
          </Card>
        )}

        {/* Quick Actions */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader title="Quick Actions" />

          <View style={{ gap: spacing[3] }}>
            {invoice.status !== "paid" && (
              <Button
                title="Mark as Paid"
                onPress={handleMarkAsPaid}
                variant="primary"
                icon="check-circle"
                loading={updateStatusMutation.isPending}
              />
            )}

            {invoice.status === "draft" && (
              <Button
                title="Mark as Sent"
                onPress={handleMarkAsSent}
                variant="primary"
                icon="send"
                loading={updateStatusMutation.isPending}
              />
            )}

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Share"
                  onPress={handleShare}
                  variant="outline"
                  icon="share"
                  loading={shareLoading}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Edit Invoice"
                  onPress={handleEdit}
                  variant="outline"
                  icon="edit"
                />
              </View>
            </View>

            <Button
              title="Delete Invoice"
              onPress={handleDelete}
              variant="danger"
              icon="trash"
              loading={deleteInvoiceMutation.isPending}
            />
          </View>
        </Card>

        {/* Regenerate PDF Button */}
        <Card
          variant="elevated"
          padding={6}
          style={{ marginBottom: spacing[6] }}
        >
          <SectionHeader title="Regenerate PDF" />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
          >
            <Button
              title="Regenerate PDF"
              onPress={handleRegenerate}
              variant="outline"
              icon="refresh"
              loading={regenLoading}
            />
            {autoRegenMutation.isPending && (
              <Badge label="Updating PDF" variant="warning" size="sm" />
            )}
          </View>
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
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          activeOpacity={1}
          onPress={() => setShowDropdownMenu(false)}
        >
          <View
            style={{
              backgroundColor: colors.white,
              margin: spacing[4],
              borderRadius: 12,
              padding: spacing[4],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.gray[900],
                marginBottom: spacing[4],
                textAlign: "center",
              }}
            >
              Invoice Actions
            </Text>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing[3],
                marginBottom: spacing[2],
              }}
              onPress={() => {
                setShowDropdownMenu(false);
                handleShare();
              }}
            >
              <FontAwesome name="share" size={20} color={colors.primary[600]} />
              <Text
                style={{
                  fontSize: 16,
                  marginLeft: spacing[3],
                  color: colors.gray[900],
                }}
              >
                Share Invoice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing[3],
                marginBottom: spacing[2],
              }}
              onPress={() => {
                setShowDropdownMenu(false);
                handleEdit();
              }}
            >
              <FontAwesome name="edit" size={20} color={colors.primary[600]} />
              <Text
                style={{
                  fontSize: 16,
                  marginLeft: spacing[3],
                  color: colors.gray[900],
                }}
              >
                Edit Invoice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing[3],
                marginBottom: spacing[2],
              }}
              onPress={() => {
                setShowDropdownMenu(false);
                setAutoRegenEnabled((v) => !v);
              }}
            >
              <FontAwesome
                name={autoRegenEnabled ? "toggle-on" : "toggle-off"}
                size={20}
                color={
                  autoRegenEnabled ? colors.primary[600] : colors.gray[500]
                }
              />
              <Text
                style={{
                  fontSize: 16,
                  marginLeft: spacing[3],
                  color: colors.gray[900],
                }}
              >
                Auto Regenerate PDF: {autoRegenEnabled ? "On" : "Off"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing[3],
                marginTop: spacing[2],
                borderTopWidth: 1,
                borderTopColor: colors.gray[200],
              }}
              onPress={() => setShowDropdownMenu(false)}
            >
              <FontAwesome name="times" size={20} color={colors.gray[500]} />
              <Text
                style={{
                  fontSize: 16,
                  marginLeft: spacing[3],
                  color: colors.gray[600],
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeScreen>
  );
}
