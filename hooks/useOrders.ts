import { useState, useCallback } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  ORDERS_PAGE_SIZE,
  OrderQueryParams,
  fetchOrdersPage,
  fetchOrderWithRelations,
  deleteOrder,
  markOrderPaid,
} from "@/services/order.service";
import type { OrderWithRelations } from "@/types/orders";
import { useToast } from "@/lib/toast";
import {
  generateAndUploadInvoicePdf,
  sharePdf,
  shareExistingInvoicePdf,
} from "@/lib/invoicePdf";
import { INVOICE_PDF_BUCKET } from "@/lib/invoiceConfig";
import {
  updateInvoicePdfUrl,
  getOrCreateInvoiceForOrder,
  fetchInvoiceByOrderId,
} from "@/services/invoice.service";

// Infinite orders list
export const useInfiniteOrders = (params: OrderQueryParams) => {
  return useInfiniteQuery({
    queryKey: ["orders", "infinite", params],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as any[]).length < ORDERS_PAGE_SIZE
        ? undefined
        : allPages.length,
    queryFn: ({ pageParam }) => fetchOrdersPage(pageParam as number, params),
  });
};

// Single order with relations (for details & rich views)
export const useOrderDetails = (id?: string) => {
  return useQuery<OrderWithRelations | null>({
    queryKey: ["order-details", id],
    queryFn: () => fetchOrderWithRelations(id as string),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Delete order mutation used by list UIs
export const useOrderDeleteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      await deleteOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// Mark order as paid
export const useOrderMarkPaidMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!orderId) throw new Error("No order ID");
      await markOrderPaid(orderId);
    },
    onSuccess: (_data, orderId) => {
      if (!orderId) return;
      queryClient.invalidateQueries({ queryKey: ["order-details", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// Invoice-related actions for a single order (create/share & regenerate PDF)
export const useOrderInvoiceActions = (order?: OrderWithRelations | null) => {
  const toast = useToast();
  const [shareLoading, setShareLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const generateInvoiceNumber = useCallback(() => {
    // For invoices created from an order, reuse the order number
    return order?.order_number || "";
  }, [order?.order_number]);

  const makeSafeFileName = useCallback((num?: string | null) => {
    const base = (num || "invoice").replace(/[^A-Za-z0-9-_]/g, "_");
    return `${base}.pdf`;
  }, []);

  const handleCreateAndShareInvoice = useCallback(async () => {
    if (!order) return;
    try {
      setShareLoading(true);

      const invoiceRecord = await getOrCreateInvoiceForOrder({
        orderId: order.id,
        customerId: order.customer_id,
        subtotal: order.subtotal || 0,
        totalTax: order.total_tax || 0,
        deliveryCharge: order.delivery_charge || 0,
        generateInvoiceNumber,
      });

      if (invoiceRecord && (invoiceRecord as any).pdf_url) {
        try {
          await shareExistingInvoicePdf(
            (invoiceRecord as any).pdf_url as string,
            (invoiceRecord as any).invoice_number,
          );
          toast.showToast("success", "Invoice Ready", "Existing PDF shared");
          return;
        } catch (e: any) {
          console.warn(
            "Existing invoice pdf_url share failed, regenerating",
            e,
          );
        }
      }

      const inv: any = invoiceRecord;
      const fileName = makeSafeFileName(inv.invoice_number);

      const { filePath, publicUrl, storagePath } =
        await generateAndUploadInvoicePdf({
          invoice: invoiceRecord as any,
          customer: (order as any).customers,
          orderItems: ((order as any).order_items || []).map((oi: any) => ({
            item_name: oi.item_name || oi.inventory?.name,
            quantity: oi.quantity,
            unit_price: oi.unit_price,
            gst_percent: oi.gst_percent,
            total_price: oi.total_price,
            tax_amount: oi.tax_amount,
            hsn: oi.inventory?.hsn || "9018",
          })),
          logo: require("@/assets/images/icon.png"),
          filename: fileName,
          bucket: INVOICE_PDF_BUCKET,
        });

      const pdfUrlToStore = publicUrl || storagePath;
      if (pdfUrlToStore) {
        await updateInvoicePdfUrl(inv.id, pdfUrlToStore);
      }

      await sharePdf(filePath);
      toast.showToast("success", "Invoice Ready", "PDF shared");
    } catch (e: any) {
      toast.showToast(
        "error",
        "Share Failed",
        e?.message || "Could not share invoice",
      );
    } finally {
      setShareLoading(false);
    }
  }, [order, generateInvoiceNumber, makeSafeFileName, toast, setShareLoading]);

  const handleRegenerateInvoice = useCallback(async () => {
    if (!order) return;
    try {
      setRegenLoading(true);

      const existingInvoice = await fetchInvoiceByOrderId(order.id);
      if (!existingInvoice) {
        toast.showToast(
          "error",
          "No Invoice",
          "Create the invoice first before regenerating",
        );
        return;
      }

      const fileName = makeSafeFileName(
        (existingInvoice as any).invoice_number,
      );

      const { filePath, publicUrl, storagePath } =
        await generateAndUploadInvoicePdf({
          invoice: existingInvoice as any,
          customer: (order as any).customers,
          orderItems: ((order as any).order_items || []).map((oi: any) => ({
            item_name: oi.item_name || oi.inventory?.name,
            quantity: oi.quantity,
            unit_price: oi.unit_price,
            gst_percent: oi.gst_percent,
            total_price: oi.total_price,
            tax_amount: oi.tax_amount,
            hsn: oi.inventory?.hsn || "",
          })),
          logo: require("@/assets/images/icon.png"),
          filename: fileName,
          bucket: INVOICE_PDF_BUCKET,
        });

      const pdfUrlToStore = publicUrl || storagePath;
      if (pdfUrlToStore) {
        await updateInvoicePdfUrl((existingInvoice as any).id, pdfUrlToStore);
      }

      await sharePdf(filePath);
      toast.showToast(
        "success",
        "PDF Ready",
        "Invoice PDF regenerated and updated",
      );
    } catch (e: any) {
      toast.showToast(
        "error",
        "Regenerate Failed",
        e?.message || "Failed to regenerate invoice",
      );
    } finally {
      setRegenLoading(false);
    }
  }, [order, makeSafeFileName, toast, setRegenLoading]);

  return {
    createAndShareInvoice: handleCreateAndShareInvoice,
    regenerateInvoice: handleRegenerateInvoice,
    shareLoading,
    regenLoading,
  };
};
