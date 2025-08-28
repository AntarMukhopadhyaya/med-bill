import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { shareAsync } from "expo-sharing";
import { supabase } from "./supabase";
import { Database } from "@/types/database.types";
import { Buffer } from "buffer";

// Simple UUID alternative using timestamp and random number
function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomPart}`;
}

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type LedgerTransaction =
  Database["public"]["Tables"]["ledger_transactions"]["Row"];

export interface LedgerPdfParams {
  customer: Customer;
  transactions: LedgerTransaction[];
  dateRange: {
    from: string;
    to: string;
  };
  openingBalance: number;
  logo?: any;
}

// Cached store fetch (single row). Avoid multiple DB hits per session/PDF batch.
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

export async function generateLedgerPdf({
  customer,
  transactions,
  dateRange,
  openingBalance,
  logo,
}: LedgerPdfParams): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([842, 1191]); // Match invoice size (landscape A4)
  let { width, height } = page.getSize();

  let currentY = height - 40;
  const margin = 40;
  const lineHeight = 16;

  // Helper functions
  function drawText(text: string, x: number, y: number, options: any = {}) {
    // pdf-lib StandardFonts (Helvetica) are limited to WinAnsi encoding and cannot encode the Rupee symbol (₹ – U+20B9)
    // which causes: "WinAnsi cannot encode ...". For now, replace it with 'INR'.
    // To properly render the symbol, embed a Unicode TTF that contains U+20B9 (e.g., NotoSans/Roboto) and use that font instead.
    const safeText = text.replace(/\u20B9/g, "INR");
    page.drawText(safeText, {
      x,
      y,
      size: options.size || 10,
      font: options.bold ? boldFont : font,
      color: options.color || rgb(0, 0, 0),
    });
  }

  function drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness = 0.5
  ) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: rgb(0, 0, 0),
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
      borderColor: options.borderColor || rgb(0, 0, 0),
      borderWidth: options.borderWidth || 0.5,
      color: options.fillColor || rgb(1, 1, 1),
    });
  }

  // Prepare watermark (draw later after header backgrounds)
  let __watermark: { draw: () => void } | null = null;
  if (logo) {
    try {
      const logoBytes = await fetchLogoBytes(logo);
      if (!logoBytes.length) {
        console.warn("Ledger PDF watermark: empty logo bytes");
      } else {
        const embedded = await pdfDoc.embedPng(logoBytes);
        const scale = Math.min(
          (width * 0.65) / embedded.width,
          (height * 0.65) / embedded.height
        );
        const wmWidth = embedded.width * scale;
        const wmHeight = embedded.height * scale;
        __watermark = {
          draw: () =>
            page.drawImage(embedded, {
              x: (width - wmWidth) / 2,
              y: (height - wmHeight) / 2,
              width: wmWidth,
              height: wmHeight,
              opacity: 0.1,
            }),
        };
      }
    } catch (e) {
      console.warn("Ledger PDF watermark failed", e);
    }
  }

  // Load store data for header
  const store = await getStoreCached();
  const headerCompany = store?.name || "Company Name";
  const headerAddress = (store?.address || "").split(/\n|,\s*/).filter(Boolean);
  const phoneText = store?.phone ? `Phone: ${store.phone}` : "";
  const emailText = store?.email ? `Email: ${store.email}` : "";

  // Styled header banner like invoice
  const headerHeight = 80;
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: rgb(0.04, 0.32, 0.55),
  });
  page.drawRectangle({
    x: 0,
    y: height - headerHeight + 40,
    width,
    height: 40,
    color: rgb(0.2, 0.6, 0.86),
    opacity: 0.3,
  });
  drawText(headerCompany, 40, height - 35, {
    size: 24,
    bold: true,
    color: rgb(1, 1, 1),
  });
  drawText("LEDGER", width - 140, height - 35, {
    size: 20,
    bold: true,
    color: rgb(1, 1, 1),
  });
  currentY = height - headerHeight - 30;
  if (__watermark) __watermark.draw();
  // Company box
  const companyBoxHeight = 90;
  page.drawRectangle({
    x: margin,
    y: currentY - companyBoxHeight,
    width: width - margin * 2,
    height: companyBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.04, 0.32, 0.55),
    borderWidth: 2,
  });
  page.drawRectangle({
    x: margin,
    y: currentY - 25,
    width: width - margin * 2,
    height: 25,
    color: rgb(0.04, 0.32, 0.55),
  });
  drawText("COMPANY DETAILS", margin + 10, currentY - 18, {
    size: 12,
    bold: true,
    color: rgb(1, 1, 1),
  });
  let infY = currentY - 40;
  const compLines: string[] = [];
  if (headerAddress.length) compLines.push(headerAddress.join(", "));
  if (phoneText || emailText)
    compLines.push([phoneText, emailText].filter(Boolean).join("  |  "));
  if (store?.gst_number || store?.state)
    compLines.push(
      `GSTIN: ${store?.gst_number || "-"}  |  State: ${store?.state || "-"}`
    );
  compLines.slice(0, 3).forEach((l) => {
    drawText(l, margin + 10, infY, { size: 10 });
    infY -= 14;
  });
  currentY -= companyBoxHeight + 25;
  drawText(`${dateRange.from} - ${dateRange.to}`, margin, currentY, {
    size: 10,
    bold: true,
    color: rgb(0.2, 0.6, 0.86),
  });
  currentY -= 25;

  // Customer Information Section
  const customerName = customer.company_name || customer.name;
  drawText(
    customerName.toUpperCase(),
    width / 2 - customerName.length * 3,
    currentY,
    {
      size: 12,
      bold: true,
    }
  );
  currentY -= 15;

  // Building address if available
  if (customer.billing_address) {
    const addressLines = customer.billing_address.split("\n");
    addressLines.forEach((line) => {
      drawText(line, width / 2 - line.length * 2.5, currentY, { size: 9 });
      currentY -= 12;
    });
  }

  // (date range already drawn)

  // Table Headers
  const tableY = currentY;
  const colWidths = [60, 50, 60, 120, 80, 80, 80]; // Column widths
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const startX = (width - tableWidth) / 2;

  // Header row background
  drawRectangle(startX, tableY - 22, tableWidth, 22, {
    fillColor: rgb(0.04, 0.32, 0.55),
    borderWidth: 1,
  });

  // Column headers
  const headers = [
    "Date",
    "Type",
    "Trans.no",
    "Particulars",
    "Debit (₹)",
    "Credit (₹)",
    "Balance",
  ];
  let currentX = startX;

  headers.forEach((header, index) => {
    drawText(header, currentX + 5, tableY - 15, {
      size: 9,
      bold: true,
      color: rgb(1, 1, 1),
    });
    if (index > 0) drawLine(currentX, tableY, currentX, tableY - 22);
    currentX += colWidths[index];
  });

  // Right border
  drawLine(currentX, tableY, currentX, tableY - 22);

  currentY = tableY - 20;

  // Opening balance row
  currentX = startX;
  const rowHeight = 18;

  drawRectangle(startX, currentY - rowHeight, tableWidth, rowHeight, {
    borderWidth: 0.5,
  });

  drawText(
    new Date(dateRange.from).toLocaleDateString("en-GB"),
    currentX + 5,
    currentY - 12,
    { size: 8 }
  );
  currentX += colWidths[0];
  drawText("", currentX + 5, currentY - 12, { size: 8 }); // Type
  currentX += colWidths[1];
  drawText("", currentX + 5, currentY - 12, { size: 8 }); // Trans.no
  currentX += colWidths[2];
  drawText("By Opening Balance", currentX + 5, currentY - 12, { size: 8 });
  currentX += colWidths[3];
  drawText("", currentX + 5, currentY - 12, { size: 8 }); // Debit
  currentX += colWidths[4];
  drawText("", currentX + 5, currentY - 12, { size: 8 }); // Credit
  currentX += colWidths[5];

  const balanceText =
    openingBalance >= 0
      ? `${openingBalance.toFixed(2)} Dr`
      : `${Math.abs(openingBalance).toFixed(2)} Cr`;
  drawText(balanceText, currentX + 5, currentY - 12, { size: 8 });

  currentY -= rowHeight;
  let runningBalance = openingBalance;

  // Transaction rows
  transactions.forEach((transaction, index) => {
    // Check if we need a new page
    if (currentY < 100) {
      page = pdfDoc.addPage([842, 1191]);
      currentY = height - 40;

      // Repeat headers on new page
      const newTableY = currentY;
      drawRectangle(startX, newTableY - 22, tableWidth, 22, {
        fillColor: rgb(0.04, 0.32, 0.55),
        borderWidth: 1,
      });

      currentX = startX;
      headers.forEach((header, index) => {
        drawText(header, currentX + 5, newTableY - 15, {
          size: 9,
          bold: true,
          color: rgb(1, 1, 1),
        });
        if (index > 0) drawLine(currentX, newTableY, currentX, newTableY - 22);
        currentX += colWidths[index];
      });
      drawLine(currentX, newTableY, currentX, newTableY - 22);
      currentY = newTableY - 20;
    }

    currentX = startX;

    drawRectangle(startX, currentY - rowHeight, tableWidth, rowHeight, {
      borderWidth: 0.3,
      color: index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 1),
    });

    // Date
    drawText(
      new Date(transaction.transaction_date).toLocaleDateString("en-GB"),
      currentX + 5,
      currentY - 12,
      { size: 8 }
    );
    currentX += colWidths[0];

    // Type
    const typeText = transaction.transaction_type === "debit" ? "Sale" : "Rcpt";
    drawText(typeText, currentX + 5, currentY - 12, { size: 8 });
    currentX += colWidths[1];

    // Transaction number
    const transNo = transaction.reference_id
      ? `${transaction.reference_id.slice(-8)}`
      : `${index + 1}`;
    drawText(transNo, currentX + 5, currentY - 12, { size: 8 });
    currentX += colWidths[2];

    // Particulars
    let particulars = transaction.description || "To Sales";
    if (transaction.transaction_type === "credit") {
      particulars = "By PAYMENT - Bank/Cash";
    }
    drawText(particulars, currentX + 5, currentY - 12, { size: 8 });
    currentX += colWidths[3];

    // Debit
    if (transaction.transaction_type === "debit") {
      drawText(transaction.amount.toFixed(2), currentX + 5, currentY - 12, {
        size: 8,
      });
      runningBalance += transaction.amount;
    }
    currentX += colWidths[4];

    // Credit
    if (transaction.transaction_type === "credit") {
      drawText(transaction.amount.toFixed(2), currentX + 5, currentY - 12, {
        size: 8,
      });
      runningBalance -= transaction.amount;
    }
    currentX += colWidths[5];

    // Balance
    const balanceText =
      runningBalance >= 0
        ? `${runningBalance.toFixed(2)} Dr`
        : `${Math.abs(runningBalance).toFixed(2)} Cr`;
    drawText(balanceText, currentX + 5, currentY - 12, { size: 8 });

    currentY -= rowHeight;
  });

  // Total row
  currentX = startX;
  drawRectangle(startX, currentY - rowHeight, tableWidth, rowHeight, {
    fillColor: rgb(0.95, 0.95, 0.95),
    borderWidth: 1,
  });

  drawText(
    "Total as on " + new Date(dateRange.to).toLocaleDateString("en-GB"),
    currentX + 5,
    currentY - 12,
    { size: 8, bold: true }
  );
  currentX += colWidths[0] + colWidths[1] + colWidths[2];

  const totalDebit = transactions
    .filter((t) => t.transaction_type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = transactions
    .filter((t) => t.transaction_type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  currentX += colWidths[3];
  drawText(totalDebit.toFixed(2), currentX + 5, currentY - 12, {
    size: 8,
    bold: true,
  });
  currentX += colWidths[4];
  drawText(totalCredit.toFixed(2), currentX + 5, currentY - 12, {
    size: 8,
    bold: true,
  });
  currentX += colWidths[5];

  currentY -= rowHeight;

  // Final balance rows
  currentX = startX;
  drawRectangle(startX, currentY - rowHeight, tableWidth, rowHeight, {
    fillColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1,
  });

  drawText(
    "Debit Balance",
    currentX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
    currentY - 12,
    { size: 9, bold: true }
  );

  const finalBalance = Math.abs(runningBalance);
  drawText(
    finalBalance.toFixed(2),
    currentX +
      colWidths[0] +
      colWidths[1] +
      colWidths[2] +
      colWidths[3] +
      colWidths[4] +
      5,
    currentY - 12,
    { size: 9, bold: true }
  );

  currentY -= rowHeight;

  // Grand total
  currentX = startX;
  drawRectangle(startX, currentY - rowHeight, tableWidth, rowHeight, {
    fillColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
  });

  drawText(
    "Grand Total",
    currentX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
    currentY - 12,
    { size: 9, bold: true }
  );

  drawText(
    (totalCredit + finalBalance).toFixed(2),
    currentX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5,
    currentY - 12,
    { size: 9, bold: true }
  );

  drawText(
    (totalDebit + finalBalance).toFixed(2),
    currentX +
      colWidths[0] +
      colWidths[1] +
      colWidths[2] +
      colWidths[3] +
      colWidths[4] +
      5,
    currentY - 12,
    { size: 9, bold: true }
  );

  // Footer with signature & page numbers
  const pages = pdfDoc.getPages();
  pages.forEach((pg: any, idx: number) => {
    const pw = pg.getSize().width;
    // Page number pill
    pg.drawRectangle({
      x: pw - 130,
      y: 40,
      width: 110,
      height: 22,
      color: rgb(0.04, 0.32, 0.55),
    });
    pg.drawText(`Page ${idx + 1} of ${pages.length}`, {
      x: pw - 122,
      y: 47,
      size: 9,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    if (idx === pages.length - 1) {
      pg.drawRectangle({
        x: pw - 260,
        y: 80,
        width: 220,
        height: 50,
        color: rgb(0.95, 0.97, 1),
        borderColor: rgb(0.04, 0.32, 0.55),
        borderWidth: 1,
      });
      pg.drawText(`FOR ${headerCompany}`, {
        x: pw - 250,
        y: 115,
        size: 10,
        font: boldFont,
        color: rgb(0.04, 0.32, 0.55),
      });
      pg.drawText("Authorised Signatory", {
        x: pw - 250,
        y: 95,
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
    const footer = `${headerCompany}${phoneText ? " | " + phoneText : ""}`;
    pg.drawText(footer, {
      x: 40,
      y: 50,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  return await pdfDoc.save();
}

async function fetchLogoBytes(asset: any): Promise<Uint8Array> {
  try {
    if (typeof asset === "number") {
      // Handle require() assets - use Asset.fromModule for Expo
      const { Asset } = await import("expo-asset");
      const assetInstance = Asset.fromModule(asset);
      await assetInstance.downloadAsync();

      if (assetInstance.localUri) {
        const response = await fetch(assetInstance.localUri);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } else if (typeof asset === "string") {
      // Handle URI strings
      const response = await fetch(asset);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch (error) {
    console.warn("Failed to fetch logo bytes:", error);
  }

  // Return empty array if fetch fails
  return new Uint8Array();
}

export async function writeLedgerPdfToFile(
  pdfBytes: Uint8Array,
  filename?: string
): Promise<string> {
  const name = filename || `ledger-${Date.now()}.pdf`;
  const filePath = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(
    filePath,
    Buffer.from(pdfBytes).toString("base64"),
    { encoding: FileSystem.EncodingType.Base64 }
  );
  return filePath;
}

export async function uploadLedgerPdfToSupabase(
  filePath: string,
  bucket: string = "ledgers"
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

export async function shareLedgerPdf(filePath: string) {
  if (!(await Sharing.isAvailableAsync())) return;
  await shareAsync(filePath);
}
