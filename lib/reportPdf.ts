import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { shareAsync } from "expo-sharing";
import { supabase } from "./supabase";
import { Buffer } from "buffer";
import {
  SalesData,
  DatabaseHealthMetrics,
  InventoryTurnoverItem,
} from "@/types/reports";

// Simple UUID alternative using timestamp and random number
function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomPart}`;
}

export interface ReportPdfParams {
  salesData: SalesData;
  healthMetrics?: DatabaseHealthMetrics;
  inventoryTurnover?: InventoryTurnoverItem[];
  customersWithBalance?: number;
  period: string;
  logo?: any;
}

// Cached store fetch (reusing pattern from invoice/ledger PDFs)
let __storeCache: any | null = null;
let __storeFetchedAt = 0;
const STORE_TTL_MS = 5 * 60 * 1000; // 5 minutes
async function getStoreCached(force = false) {
  const now = Date.now();
  if (!force && __storeCache && now - __storeFetchedAt < STORE_TTL_MS) {
    return __storeCache;
  }
  try {
    const { data, error } = await supabase.from("store").select("*").single();
    if (error) throw error;
    __storeCache = data;
    __storeFetchedAt = now;
    return __storeCache;
  } catch {
    return __storeCache; // return stale if available
  }
}

export async function generateReportPdf({
  salesData,
  healthMetrics,
  inventoryTurnover,
  customersWithBalance,
  period,
  logo,
}: ReportPdfParams): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([842, 1191]); // A4 landscape to match invoice/ledger
  let { width, height } = page.getSize();

  let currentY = height - 40;
  const margin = 40;
  const lineHeight = 16;

  // Color scheme (matching invoice/ledger)
  const colors = {
    primary: rgb(0.04, 0.32, 0.55), // Professional blue
    secondary: rgb(0.95, 0.97, 1), // Light blue
    accent: rgb(0.2, 0.6, 0.86), // Bright blue
    text: rgb(0.2, 0.2, 0.2), // Dark gray
    lightGray: rgb(0.9, 0.9, 0.9),
    white: rgb(1, 1, 1),
    success: rgb(0.13, 0.7, 0.33), // Green
    warning: rgb(1, 0.6, 0), // Orange
    danger: rgb(0.91, 0.27, 0.2), // Red
    border: rgb(0.85, 0.85, 0.85),
  };

  // Helper functions
  function drawText(text: string, x: number, y: number, options: any = {}) {
    // Sanitize text for WinAnsi encoding (same as invoice/ledger)
    const safeText = text.replace(/₹/g, "Rs.").replace(/[^\x00-\xFF]/g, "?");
    page.drawText(safeText, {
      x,
      y,
      size: options.size || 10,
      font: options.bold ? boldFont : font,
      color: options.color || colors.text,
    });
  }

  function drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = colors.border,
    thickness = 1
  ) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color,
    });
  }

  function drawRectangle(
    x: number,
    y: number,
    w: number,
    h: number,
    options: any = {}
  ) {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      borderColor: options.borderColor || colors.border,
      borderWidth: options.borderWidth || 0,
      color: options.color || colors.white,
    });
  }

  // Watermark (consistent with invoice/ledger)
  let __watermark: { draw: () => void } | null = null;
  if (logo) {
    try {
      const logoBytes = await fetchLogoBytes(logo);
      if (logoBytes.length > 0) {
        const embedded = await pdfDoc.embedPng(logoBytes);
        const scale = Math.min(
          (width * 0.65) / embedded.width,
          (height * 0.65) / embedded.height
        );
        const wmWidth = embedded.width * scale;
        const wmHeight = embedded.height * scale;
        __watermark = {
          draw: () => {
            page.drawImage(embedded, {
              x: (width - wmWidth) / 2,
              y: (height - wmHeight) / 2,
              width: wmWidth,
              height: wmHeight,
              opacity: 0.1,
            });
          },
        };
      }
    } catch (e) {
      console.warn("Report PDF watermark failed", e);
    }
  }

  // Load store data for header
  const store = await getStoreCached();
  const headerCompany = store?.name || "Company Name";
  const headerAddress = (store?.address || "").split(/\n|,\s*/).filter(Boolean);
  const phoneText = store?.phone ? `Phone: ${store.phone}` : "";
  const emailText = store?.email ? `Email: ${store.email}` : "";

  // Professional header section (matching invoice/ledger style)
  const headerHeight = 80;

  // Main header background
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width: width,
    height: headerHeight,
    color: colors.primary,
  });

  // Secondary gradient effect
  page.drawRectangle({
    x: 0,
    y: height - headerHeight + 40,
    width: width,
    height: 40,
    color: colors.accent,
    opacity: 0.3,
  });

  // Company name and report title in header
  drawText(headerCompany, margin, height - 35, {
    size: 24,
    bold: true,
    color: colors.white,
  });

  drawText("ANALYTICS REPORT", width - 220, height - 35, {
    size: 20,
    bold: true,
    color: colors.white,
  });

  // Draw watermark after header backgrounds
  if (__watermark) __watermark.draw();

  currentY = height - headerHeight - 20;

  // Report details section
  const detailsBoxHeight = 60;
  page.drawRectangle({
    x: margin,
    y: currentY - detailsBoxHeight,
    width: width - 2 * margin,
    height: detailsBoxHeight,
    color: colors.secondary,
    borderColor: colors.border,
    borderWidth: 1,
  });

  drawText("Report Period:", margin + 10, currentY - 20, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  const periodDisplay = period.charAt(0).toUpperCase() + period.slice(1);
  drawText(periodDisplay, margin + 120, currentY - 20, {
    size: 11,
    color: colors.text,
  });

  drawText("Generated:", width - 200, currentY - 20, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  const dateStr = new Date().toLocaleDateString();
  drawText(dateStr, width - 120, currentY - 20, {
    size: 11,
    color: colors.text,
  });

  drawText("Total Sales:", margin + 10, currentY - 40, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  drawText(
    `Rs.${salesData.totalSales.toLocaleString()}`,
    margin + 120,
    currentY - 40,
    {
      size: 11,
      bold: true,
      color: colors.success,
    }
  );

  drawText("Total Orders:", width - 200, currentY - 40, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  drawText(salesData.totalOrders.toString(), width - 120, currentY - 40, {
    size: 11,
    bold: true,
    color: colors.text,
  });

  currentY -= detailsBoxHeight + 30;

  // Key Metrics Section
  drawText("KEY METRICS", margin, currentY, {
    size: 16,
    bold: true,
    color: colors.primary,
  });
  currentY -= 25;

  // Metrics boxes
  const metricBoxWidth = (width - 2 * margin - 30) / 4;
  const metricBoxHeight = 80;

  const metrics = [
    {
      title: "Total Sales",
      value: `Rs.${salesData.totalSales.toLocaleString()}`,
      color: colors.success,
    },
    {
      title: "Total Orders",
      value: salesData.totalOrders.toString(),
      color: colors.primary,
    },
    {
      title: "Avg Order Value",
      value: `Rs.${Math.round(salesData.averageOrderValue)}`,
      color: colors.accent,
    },
    {
      title: "Pending Payments",
      value: salesData.paymentStatus.pending.toString(),
      color: colors.warning,
    },
  ];

  metrics.forEach((metric, index) => {
    const x = margin + index * (metricBoxWidth + 10);

    // Metric box
    drawRectangle(
      x,
      currentY - metricBoxHeight,
      metricBoxWidth,
      metricBoxHeight,
      {
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
      }
    );

    // Metric header
    drawRectangle(x, currentY - 25, metricBoxWidth, 25, {
      color: metric.color,
    });

    drawText(metric.title, x + 10, currentY - 18, {
      size: 10,
      bold: true,
      color: colors.white,
    });

    drawText(metric.value, x + 10, currentY - 50, {
      size: 14,
      bold: true,
      color: colors.text,
    });
  });

  currentY -= metricBoxHeight + 30;

  // Payment Status Chart (simplified representation)
  drawText("PAYMENT STATUS", margin, currentY, {
    size: 16,
    bold: true,
    color: colors.primary,
  });
  currentY -= 25;

  const chartHeight = 100;
  const chartWidth = 300;

  drawRectangle(margin, currentY - chartHeight, chartWidth, chartHeight, {
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });

  // Simple bar representation of payment status
  const totalPayments =
    salesData.paymentStatus.paid +
    salesData.paymentStatus.pending +
    salesData.paymentStatus.overdue;
  if (totalPayments > 0) {
    const barWidth = (chartWidth - 40) / 3;
    const maxHeight = chartHeight - 40;

    // Paid bar
    const paidHeight =
      (salesData.paymentStatus.paid / totalPayments) * maxHeight;
    if (paidHeight > 0) {
      drawRectangle(
        margin + 10,
        currentY - chartHeight + 20,
        barWidth,
        paidHeight,
        {
          color: colors.success,
        }
      );
    }

    // Pending bar
    const pendingHeight =
      (salesData.paymentStatus.pending / totalPayments) * maxHeight;
    if (pendingHeight > 0) {
      drawRectangle(
        margin + 20 + barWidth,
        currentY - chartHeight + 20,
        barWidth,
        pendingHeight,
        {
          color: colors.warning,
        }
      );
    }

    // Overdue bar
    const overdueHeight =
      (salesData.paymentStatus.overdue / totalPayments) * maxHeight;
    if (overdueHeight > 0) {
      drawRectangle(
        margin + 30 + barWidth * 2,
        currentY - chartHeight + 20,
        barWidth,
        overdueHeight,
        {
          color: colors.danger,
        }
      );
    }

    // Labels
    drawText(
      `Paid: ${salesData.paymentStatus.paid}`,
      margin + 10,
      currentY - chartHeight - 10,
      {
        size: 9,
        color: colors.success,
      }
    );
    drawText(
      `Pending: ${salesData.paymentStatus.pending}`,
      margin + 20 + barWidth,
      currentY - chartHeight - 10,
      {
        size: 9,
        color: colors.warning,
      }
    );
    drawText(
      `Overdue: ${salesData.paymentStatus.overdue}`,
      margin + 30 + barWidth * 2,
      currentY - chartHeight - 10,
      {
        size: 9,
        color: colors.danger,
      }
    );
  }

  currentY -= chartHeight + 40;

  // Top Customers Section
  if (salesData.topCustomers.length > 0) {
    drawText("TOP CUSTOMERS", margin, currentY, {
      size: 16,
      bold: true,
      color: colors.primary,
    });
    currentY -= 25;

    // Table header
    const tableWidth = width - 2 * margin;
    const colWidths = [tableWidth * 0.4, tableWidth * 0.3, tableWidth * 0.3];

    drawRectangle(margin, currentY - 22, tableWidth, 22, {
      color: colors.primary,
    });

    let currentX = margin;
    const headers = ["Customer Name", "Orders", "Total Spent"];
    headers.forEach((header, index) => {
      drawText(header, currentX + 5, currentY - 15, {
        size: 10,
        bold: true,
        color: colors.white,
      });
      currentX += colWidths[index];
    });

    currentY -= 22;

    // Customer rows (top 5)
    salesData.topCustomers.slice(0, 5).forEach((customer, index) => {
      const rowHeight = 20;
      const backgroundColor = index % 2 === 0 ? colors.white : colors.secondary;

      drawRectangle(margin, currentY - rowHeight, tableWidth, rowHeight, {
        color: backgroundColor,
        borderColor: colors.border,
        borderWidth: 0.5,
      });

      currentX = margin;
      drawText(customer.name, currentX + 5, currentY - 12, { size: 9 });
      currentX += colWidths[0];
      drawText(customer.orderCount.toString(), currentX + 5, currentY - 12, {
        size: 9,
      });
      currentX += colWidths[1];
      drawText(
        `Rs.${customer.totalSpent.toLocaleString()}`,
        currentX + 5,
        currentY - 12,
        { size: 9 }
      );

      currentY -= rowHeight;
    });

    currentY -= 20;
  }

  // Top Products Section
  if (salesData.topProducts.length > 0) {
    drawText("TOP PRODUCTS", margin, currentY, {
      size: 16,
      bold: true,
      color: colors.primary,
    });
    currentY -= 25;

    // Table header
    const tableWidth = width - 2 * margin;
    const colWidths = [tableWidth * 0.4, tableWidth * 0.3, tableWidth * 0.3];

    drawRectangle(margin, currentY - 22, tableWidth, 22, {
      color: colors.primary,
    });

    let currentX = margin;
    const headers = ["Product Name", "Quantity Sold", "Revenue"];
    headers.forEach((header, index) => {
      drawText(header, currentX + 5, currentY - 15, {
        size: 10,
        bold: true,
        color: colors.white,
      });
      currentX += colWidths[index];
    });

    currentY -= 22;

    // Product rows (top 5)
    salesData.topProducts.slice(0, 5).forEach((product, index) => {
      const rowHeight = 20;
      const backgroundColor = index % 2 === 0 ? colors.white : colors.secondary;

      drawRectangle(margin, currentY - rowHeight, tableWidth, rowHeight, {
        color: backgroundColor,
        borderColor: colors.border,
        borderWidth: 0.5,
      });

      currentX = margin;
      drawText(product.name, currentX + 5, currentY - 12, { size: 9 });
      currentX += colWidths[0];
      drawText(product.quantitySold.toString(), currentX + 5, currentY - 12, {
        size: 9,
      });
      currentX += colWidths[1];
      drawText(
        `Rs.${product.revenue.toLocaleString()}`,
        currentX + 5,
        currentY - 12,
        { size: 9 }
      );

      currentY -= rowHeight;
    });
  }

  // Footer (matching invoice/ledger style)
  const pages = pdfDoc.getPages();
  pages.forEach((pg: any, idx: number) => {
    const pw = pg.getSize().width;
    // Page number
    pg.drawRectangle({
      x: pw - 130,
      y: 40,
      width: 110,
      height: 22,
      color: colors.primary,
    });
    pg.drawText(`Page ${idx + 1} of ${pages.length}`, {
      x: pw - 122,
      y: 47,
      size: 9,
      font: boldFont,
      color: colors.white,
    });

    // Company branding footer
    const footer = `${headerCompany}${phoneText ? " | " + phoneText : ""}`;
    pg.drawText(footer, {
      x: 40,
      y: 50,
      size: 9,
      font,
      color: colors.text,
    });

    const currentDate = new Date().toLocaleDateString();
    pg.drawText(`Generated: ${currentDate}`, {
      x: pw - 200,
      y: 25,
      size: 8,
      font,
      color: colors.text,
    });
  });

  return await pdfDoc.save();
}

async function fetchLogoBytes(asset: any): Promise<Uint8Array> {
  try {
    if (typeof asset === "number") {
      const { Asset } = await import("expo-asset");
      const assetInstance = Asset.fromModule(asset);
      await assetInstance.downloadAsync();

      if (assetInstance.localUri) {
        const response = await fetch(assetInstance.localUri);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } else if (typeof asset === "string") {
      const response = await fetch(asset);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch (error) {
    console.warn("Failed to fetch logo bytes:", error);
  }

  return new Uint8Array();
}

export async function writeReportPdfToFile(
  pdfBytes: Uint8Array,
  filename?: string
): Promise<string> {
  const name = filename || `analytics-report-${Date.now()}.pdf`;
  const filePath = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(
    filePath,
    Buffer.from(pdfBytes).toString("base64"),
    { encoding: FileSystem.EncodingType.Base64 }
  );
  return filePath;
}

export async function uploadReportPdfToSupabase(
  filePath: string,
  bucket: string = "reports"
): Promise<{ storagePath: string; publicUrl?: string }> {
  const fileBytesB64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileBytes = Buffer.from(fileBytesB64, "base64");
  const path = `${generateUniqueId()}.pdf`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function shareReportPdf(filePath: string) {
  if (!(await Sharing.isAvailableAsync())) return;
  await shareAsync(filePath);
}
