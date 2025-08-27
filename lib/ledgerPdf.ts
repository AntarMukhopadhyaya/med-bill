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

// Professional header configuration matching your image format
const HEADER_CONFIG = {
  companyName: "TRUVIZ OPHTHALMIC",
  address1: "First Floor, Plot no.1/19, Ungaranahalli,",
  address2: "Collector office viaDharmapuri - 636705, Tamil Nadu",
  phone: "Phone : 9940898155",
  email: "Email : ssssc1978@gmail.com",
};

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

  let page = pdfDoc.addPage([595, 842]); // A4 size
  let { width, height } = page.getSize();

  let currentY = height - 40;
  const margin = 40;
  const lineHeight = 16;

  // Helper functions
  function drawText(text: string, x: number, y: number, options: any = {}) {
    page.drawText(text, {
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

  // Add watermark logo if provided
  if (logo) {
    try {
      const logoBytes = await fetchLogoBytes(logo);
      const embedded = await pdfDoc.embedPng(logoBytes);
      const scale = Math.min(
        (width * 0.3) / embedded.width,
        (height * 0.3) / embedded.height
      );
      const wmWidth = embedded.width * scale;
      const wmHeight = embedded.height * scale;
      page.drawImage(embedded, {
        x: (width - wmWidth) / 2,
        y: (height - wmHeight) / 2,
        width: wmWidth,
        height: wmHeight,
        opacity: 0.05,
      });
    } catch (error) {
      console.warn("Failed to add watermark:", error);
    }
  }

  // Header Section
  drawText(HEADER_CONFIG.companyName, width / 2 - 80, currentY, {
    size: 14,
    bold: true,
  });
  currentY -= 20;

  drawText(HEADER_CONFIG.address1, width / 2 - 120, currentY, { size: 9 });
  currentY -= 12;

  drawText(HEADER_CONFIG.address2, width / 2 - 80, currentY, { size: 9 });
  currentY -= 12;

  drawText(HEADER_CONFIG.phone, width / 2 - 60, currentY, { size: 9 });
  drawText(HEADER_CONFIG.email, width / 2 + 20, currentY, { size: 9 });
  currentY -= 30;

  // Ledger Title
  drawText("LEDGER", width / 2 - 25, currentY, { size: 14, bold: true });
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

  // Date range
  drawText(`${dateRange.from} - ${dateRange.to}`, width / 2 - 40, currentY, {
    size: 9,
  });
  currentY -= 30;

  // Table Headers
  const tableY = currentY;
  const colWidths = [60, 50, 60, 120, 80, 80, 80]; // Column widths
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const startX = (width - tableWidth) / 2;

  // Header row background
  drawRectangle(startX, tableY - 20, tableWidth, 20, {
    fillColor: rgb(0.9, 0.9, 0.9),
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
    drawText(header, currentX + 5, tableY - 14, { size: 9, bold: true });

    // Vertical lines for columns
    if (index > 0) {
      drawLine(currentX, tableY, currentX, tableY - 20);
    }

    currentX += colWidths[index];
  });

  // Right border
  drawLine(currentX, tableY, currentX, tableY - 20);

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
      page = pdfDoc.addPage([595, 842]);
      currentY = height - 40;

      // Repeat headers on new page
      const newTableY = currentY;
      drawRectangle(startX, newTableY - 20, tableWidth, 20, {
        fillColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      currentX = startX;
      headers.forEach((header, index) => {
        drawText(header, currentX + 5, newTableY - 14, { size: 9, bold: true });
        if (index > 0) {
          drawLine(currentX, newTableY, currentX, newTableY - 20);
        }
        currentX += colWidths[index];
      });
      drawLine(currentX, newTableY, currentX, newTableY - 20);
      currentY = newTableY - 20;
    }

    currentX = startX;

    drawRectangle(startX, currentY - rowHeight, tableWidth, rowHeight, {
      borderWidth: 0.5,
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
