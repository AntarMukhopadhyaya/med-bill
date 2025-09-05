import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { shareAsync } from "expo-sharing";
import { supabase } from "./supabase";
import { Database } from "@/types/database.types";
import { Buffer } from "buffer";
import {
  INVOICE_PDF_BUCKET,
  SHOP_DETAILS as FALLBACK_SHOP,
} from "./invoiceConfig";
import { numberToIndianCurrencyWords } from "./numberToWords";
import { InvoiceWithRelations } from "@/types/invoice";

// Simple UUID alternative using timestamp and random number
function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomPart}`;
}

// Function to sanitize text for WinAnsi encoding
function sanitizeText(text: string): string {
  return text
    .replace(/₹/g, "Rs.") // Replace rupee symbol
    .replace(/[^\x00-\xFF]/g, "?") // Replace any non-WinAnsi characters with ?
    .trim();
}

export interface InvoicePdfParams {
  invoice: InvoiceWithRelations;
  customer?: Database["public"]["Tables"]["customers"]["Row"] | null;
  orderItems?: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    gst_percent: number;
    total_price: number;
    tax_amount: number;
  }>; // optional order items
  logo?: any; // require() of logo for watermark
}

async function fetchOrderItems(order_id?: string | null) {
  if (!order_id) return [] as any[];
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "item_name, quantity, unit_price, gst_percent, tax_amount, total_price"
    )
    .eq("order_id", order_id);
  if (error) return [];
  return (data || []).map((d: any) => ({
    item_name: d.item_name,
    quantity: d.quantity || 0,
    unit_price: d.unit_price || 0,
    gst_percent: d.gst_percent || 0,
    total_price: d.total_price || 0,
    tax_amount: d.tax_amount || 0,
  }));
}

export async function generateInvoicePdf({
  invoice,
  customer,
  orderItems = [],
  logo,
}: InvoicePdfParams): Promise<Uint8Array> {
  // Resolve store (shop) details with in-memory caching (5 min TTL)
  let SHOP_DETAILS = FALLBACK_SHOP;
  const globalAny: any = globalThis as any;
  if (
    !globalAny.__storeCache ||
    Date.now() - (globalAny.__storeCacheTime || 0) > 5 * 60 * 1000
  ) {
    try {
      const { data } = await supabase.from("store").select("*").single();
      if (data) {
        globalAny.__storeCache = data;
        globalAny.__storeCacheTime = Date.now();
      }
    } catch {}
  }
  const s: any = globalAny.__storeCache;
  if (s) {
    SHOP_DETAILS = {
      shopName: s.name || FALLBACK_SHOP.shopName,
      addressLine1: s.address || "",
      phone: s.phone || FALLBACK_SHOP.phone,
      email: s.email || FALLBACK_SHOP.email,
      gstin: s.gst_number || FALLBACK_SHOP.gstin,
      state: s.state || FALLBACK_SHOP.state,
      bankAccountNumber:
        s.bank_account_number || FALLBACK_SHOP.bankAccountNumber,
      bankIFSC:
        s.bank_ifsc_code || "Aryakanya school road,  Aradanga,  Asansol 713303",
      bankBranch: "Asansol",
      bankName: s.bank_name || FALLBACK_SHOP.bankName,
      terms: FALLBACK_SHOP.terms,
    };
  }
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([842, 1191]); // A4 size
  let { width, height } = page.getSize();

  // Color scheme
  const colors = {
    primary: rgb(0.04, 0.32, 0.55), // Professional blue
    secondary: rgb(0.95, 0.97, 1), // Light blue
    accent: rgb(0.2, 0.6, 0.86), // Bright blue
    text: rgb(0.2, 0.2, 0.2), // Dark gray
    lightGray: rgb(0.9, 0.9, 0.9),
    white: rgb(1, 1, 1),
    success: rgb(0.13, 0.7, 0.33), // Green
    border: rgb(0.85, 0.85, 0.85),
  };

  // (Removed duplicate non-cached store fetch block)

  // If no orderItems provided, attempt fetch from order_id
  if (!orderItems.length) {
    orderItems = await fetchOrderItems(invoice.order_id as any);
  }

  // Defer watermark drawing until after header so it's not fully covered
  let __watermark: { draw: () => void } | null = null;
  if (logo) {
    try {
      const logoBytes = await fetchLogoBytes(logo);
      if (!logoBytes.length) {
        console.warn("Invoice PDF watermark: empty logo bytes");
      } else {
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
              opacity: 0.1, // slightly stronger so it's visible beneath table cells
            });
          },
        };
      }
    } catch (e) {
      console.warn("Invoice PDF watermark failed", e);
    }
  }

  let cursorY = height - 30;
  const lineHeight = 16;
  const margin = 40;

  // Enhanced text function with better styling
  function text(txt: string, x: number, y: number, opts: any = {}) {
    const sanitizedText = sanitizeText(txt);
    page.drawText(sanitizedText, {
      x,
      y,
      size: opts.size || 10,
      font: opts.bold ? boldFont : font,
      color: opts.color || colors.text,
    });
  }

  // Enhanced line function
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

  // Professional header section with gradient-like effect
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

  // Company name in header
  text(SHOP_DETAILS.shopName, margin, height - 35, {
    size: 24,
    bold: true,
    color: colors.white,
  });

  text("INVOICE", width - 140, height - 35, {
    size: 20,
    bold: true,
    color: colors.white,
  });

  // Draw watermark now (after header backgrounds so it shows under content)
  if (__watermark) __watermark.draw();
  cursorY = height - headerHeight - 20;

  // Invoice details section with professional styling
  const detailsBoxHeight = 60;
  page.drawRectangle({
    x: margin,
    y: cursorY - detailsBoxHeight,
    width: width - 2 * margin,
    height: detailsBoxHeight,
    color: colors.secondary,
    borderColor: colors.border,
    borderWidth: 1,
  });

  // Invoice number and date with better layout
  text("Invoice No:", margin + 10, cursorY - 20, {
    size: 11,
    bold: true,
    color: colors.primary,
  });
  const invoiceNumber = invoice.invoice_number;
  if (invoiceNumber.length > 25) {
    const chunks = invoiceNumber.match(/.{1,25}/g) || [invoiceNumber];
    chunks.forEach((chunk, index) => {
      text(chunk, margin + 100, cursorY - 20 - index * 12, {
        size: 11,
        color: colors.text,
      });
    });
  } else {
    text(invoiceNumber, margin + 100, cursorY - 20, {
      size: 11,
      color: colors.text,
    });
  }

  text("Date:", width - 200, cursorY - 20, {
    size: 11,
    bold: true,
    color: colors.primary,
  });
  const dateStr = invoice.issue_date;
  const dateDisplay = dateStr
    ? new Date(dateStr).toLocaleDateString()
    : "No date";
  text(dateDisplay, width - 120, cursorY - 20, {
    size: 11,
    color: colors.text,
  });

  cursorY -= detailsBoxHeight + 20;

  // Enhanced shop details section
  const shopBoxHeight = 100;
  page.drawRectangle({
    x: margin,
    y: cursorY - shopBoxHeight,
    width: width - 2 * margin,
    height: shopBoxHeight,
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: 2,
  });

  // Shop details header
  page.drawRectangle({
    x: margin,
    y: cursorY - 25,
    width: width - 2 * margin,
    height: 25,
    color: colors.primary,
  });

  text("COMPANY DETAILS", margin + 10, cursorY - 18, {
    size: 12,
    bold: true,
    color: colors.white,
  });

  let boxTextY = cursorY - 40;
  const shopLines = [
    `${SHOP_DETAILS.addressLine1}`,
    `Phone: ${SHOP_DETAILS.phone}  |  Email: ${SHOP_DETAILS.email}`,
    `GSTIN: ${SHOP_DETAILS.gstin}  |  State: ${SHOP_DETAILS.state}`,
  ];

  shopLines.forEach((line, index) => {
    text(line, margin + 10, boxTextY, {
      size: 10,
      color: colors.text,
      bold: index === 0,
    });
    boxTextY -= lineHeight;
  });

  cursorY -= shopBoxHeight + 20;

  // Enhanced customer information section with multiline wrapping
  const colWidth = (width - 2 * margin - 10) / 2;
  // Helper: wrap lines to fit column width (approximate measurement using font width)
  const wrapText = (rawLines: string[], maxWidth: number, fontSize: number) => {
    const wrapped: string[] = [];
    rawLines.forEach((ln) => {
      const line = (ln || "").replace(/\r/g, "").trim();
      if (!line) return;
      const words = line.split(/\s+/);
      let current = "";
      words.forEach((w) => {
        const tentative = current ? current + " " + w : w;
        const tw = font.widthOfTextAtSize(sanitizeText(tentative), fontSize);
        if (tw > maxWidth && current) {
          wrapped.push(current);
          current = w;
        } else {
          current = tentative;
        }
      });
      if (current) wrapped.push(current);
    });
    return wrapped;
  };

  const customerName = customer?.name || "Customer";
  const billingRaw = [
    customerName,
    customer?.company_name || "",
    customer?.phone || "",
    customer?.email || "",
    customer?.billing_address || "",
  ].filter((l) => l && l.trim() !== "");

  // If a shipping address field exists, fall back to billing if missing
  const shippingRaw = [
    customerName,
    customer?.company_name || "",
    customer?.phone || "",
    customer?.email || "",
    (customer as any)?.shipping_address || customer?.billing_address || "",
  ].filter((l) => l && l.trim() !== "");

  const innerPadding = 10; // left padding
  const textWidthLimit = colWidth - innerPadding * 2; // account for padding both sides
  const fontSize = 10;
  const billingLines = wrapText(billingRaw, textWidthLimit, fontSize);
  const shippingLines = wrapText(shippingRaw, textWidthLimit, fontSize);
  const maxLines = Math.max(billingLines.length, shippingLines.length);
  const minAddrHeight = 110; // baseline similar to previous 130 but dynamic
  const dynamicHeight =
    25 /* header */ + 15 /* top gap */ + maxLines * lineHeight + 15; // bottom padding
  const addrHeight = Math.max(minAddrHeight, dynamicHeight);

  // Bill To box
  page.drawRectangle({
    x: margin,
    y: cursorY - addrHeight,
    width: colWidth,
    height: addrHeight,
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });
  // Bill To header bar
  page.drawRectangle({
    x: margin,
    y: cursorY - 25,
    width: colWidth,
    height: 25,
    color: colors.secondary,
  });
  text("BILL TO", margin + innerPadding, cursorY - 18, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  // Ship To box
  const shipX = margin + colWidth + 10;
  page.drawRectangle({
    x: shipX,
    y: cursorY - addrHeight,
    width: colWidth,
    height: addrHeight,
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: shipX,
    y: cursorY - 25,
    width: colWidth,
    height: 25,
    color: colors.secondary,
  });
  text("SHIP TO", shipX + innerPadding, cursorY - 18, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  // Render wrapped lines
  let billY = cursorY - 40;
  let shipY = cursorY - 40;
  billingLines.forEach((line, idx) => {
    text(line, margin + innerPadding, billY, {
      size: fontSize,
      color: colors.text,
      bold: idx === 0,
    });
    billY -= lineHeight;
  });
  shippingLines.forEach((line, idx) => {
    text(line, shipX + innerPadding, shipY, {
      size: fontSize,
      color: colors.text,
      bold: idx === 0,
    });
    shipY -= lineHeight;
  });

  cursorY -= addrHeight + 30;

  // Enhanced items table with professional styling
  const tableX = margin;
  const tableWidth = width - 2 * margin;
  const headers = [
    "SL",
    "Item Description",
    "HSN",
    "Qty",
    "Rate",
    "Amount",
    "Tax",
    "Total",
  ];
  const colPerc = [0.06, 0.32, 0.1, 0.08, 0.14, 0.14, 0.08, 0.14];
  let currentY = cursorY;

  // Table header with gradient effect
  page.drawRectangle({
    x: tableX,
    y: currentY - 25,
    width: tableWidth,
    height: 25,
    color: colors.primary,
  });

  // Header shadow effect
  page.drawRectangle({
    x: tableX,
    y: currentY - 27,
    width: tableWidth,
    height: 2,
    color: colors.accent,
  });

  let runningX = tableX + 8;
  headers.forEach((header, i) => {
    text(header, runningX, currentY - 16, {
      size: 10,
      bold: true,
      color: colors.white,
    });
    runningX += tableWidth * colPerc[i];
  });
  currentY -= 25;

  // Enhanced data rows with alternating colors
  const items = orderItems.length
    ? orderItems
    : [
        {
          item_name: "Service/Product",
          quantity: 1,
          unit_price: invoice.amount,
          gst_percent: invoice.tax
            ? (invoice.tax / (invoice.amount || 1)) * 100
            : 0,
          total_price: invoice.amount + invoice.tax,
          tax_amount: invoice.tax,
        },
      ];

  let index = 0;
  let totalQty = 0;
  let totalGst = 0;
  let totalAmt = 0;

  for (const item of items) {
    const rowHeight = 22;

    if (currentY - rowHeight < 150) {
      // Create new page with enhanced header
      text("Continued on next page...", width - 200, 80, {
        size: 9,
        color: colors.primary,
      });
      page = pdfDoc.addPage([842, 1191]);
      ({ width, height } = page.getSize());
      currentY = height - 100;

      // Repeat enhanced table header on new page
      page.drawRectangle({
        x: tableX,
        y: currentY - 25,
        width: tableWidth,
        height: 25,
        color: colors.primary,
      });

      let hx = tableX + 8;
      headers.forEach((header, i) => {
        text(header, hx, currentY - 16, {
          size: 10,
          bold: true,
          color: colors.white,
        });
        hx += tableWidth * colPerc[i];
      });
      currentY -= 25;
    }

    // Alternating row colors for better readability
    const rowColor = index % 2 === 0 ? colors.white : colors.secondary;

    page.drawRectangle({
      x: tableX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: rowColor,
      borderColor: colors.border,
      borderWidth: 0.5,
    });

    const gross = item.unit_price * item.quantity;
    const gstAmt = item.tax_amount;
    const total = item.total_price;

    const rowData = [
      String(++index),
      item.item_name || "Item",
      (item as any).hsn || "",
      String(item.quantity),
      `Rs. ${item.unit_price.toFixed(2)}`,
      `Rs. ${gross.toFixed(2)}`,
      `${item.gst_percent.toFixed(1)}%`,
      `Rs. ${total.toFixed(2)}`,
    ];

    let cellX = tableX + 8;
    rowData.forEach((data, i) => {
      text(data, cellX, currentY - 14, {
        size: 9,
        color: colors.text,
        bold: i === rowData.length - 1, // Bold for total column
      });
      cellX += tableWidth * colPerc[i];
    });

    currentY -= rowHeight;
    totalQty += item.quantity;
    totalGst += gstAmt;
    totalAmt += total;
  }

  // Enhanced totals section
  page.drawRectangle({
    x: tableX,
    y: currentY - 25,
    width: tableWidth,
    height: 25,
    color: colors.primary,
  });

  let totalX = tableX + 8;
  const totalData = [
    "TOTAL",
    String(totalQty),
    "",
    "",
    "",
    "",
    `Rs. ${totalGst.toFixed(2)}`,
    `Rs. ${totalAmt.toFixed(2)}`,
  ];

  totalData.forEach((data, i) => {
    text(data, totalX, currentY - 16, {
      size: 10,
      bold: true,
      color: colors.white,
    });
    totalX += tableWidth * colPerc[i];
  });
  currentY -= 50;

  // Enhanced summary section with two columns
  const summaryWidth = 300;
  const summaryX = width - summaryWidth - margin;

  // Summary box
  page.drawRectangle({
    x: summaryX,
    y: currentY - 100,
    width: summaryWidth,
    height: 100,
    color: colors.secondary,
    borderColor: colors.primary,
    borderWidth: 1,
  });

  // Summary header
  page.drawRectangle({
    x: summaryX,
    y: currentY - 25,
    width: summaryWidth,
    height: 25,
    color: colors.primary,
  });

  text("PAYMENT SUMMARY", summaryX + 10, currentY - 16, {
    size: 11,
    bold: true,
    color: colors.white,
  });

  // Summary details
  const subtotal = invoice.amount || 0;
  const tax = invoice.tax || 0;
  const delivery = invoice.delivery_charge || 0;
  const grandTotal = subtotal + tax + delivery;

  let summaryY = currentY - 40;
  const summaryItems = [
    ["Subtotal:", `Rs. ${subtotal.toFixed(2)}`],
    ["Tax Amount:", `Rs. ${tax.toFixed(2)}`],
    ["Delivery Charge:", `Rs. ${delivery.toFixed(2)}`],
    ["Grand Total:", `Rs. ${grandTotal.toFixed(2)}`],
  ];

  summaryItems.forEach((item, index) => {
    const isLast = index === summaryItems.length - 1;
    text(item[0], summaryX + 10, summaryY, {
      size: isLast ? 11 : 10,
      bold: isLast,
      color: colors.text,
    });
    text(item[1], summaryX + summaryWidth - 100, summaryY, {
      size: isLast ? 11 : 10,
      bold: true,
      color: isLast ? colors.primary : colors.text,
    });
    summaryY -= lineHeight + 2;
  });

  // Enhanced bank details section
  page.drawRectangle({
    x: margin,
    y: currentY - 100,
    width: summaryX - margin - 20,
    height: 100,
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });

  page.drawRectangle({
    x: margin,
    y: currentY - 25,
    width: summaryX - margin - 20,
    height: 25,
    color: colors.secondary,
  });

  text("BANK DETAILS", margin + 10, currentY - 16, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  let bankY = currentY - 40;
  const bankDetails = [
    `Account: ${SHOP_DETAILS.bankAccountNumber}`,
    `IFSC: ${SHOP_DETAILS.bankIFSC}`,
    `Bank: ${SHOP_DETAILS.bankName}`,
    `Branch: ${SHOP_DETAILS.bankBranch}`,
  ];

  bankDetails.forEach((detail) => {
    text(detail, margin + 10, bankY, { size: 10, color: colors.text });
    bankY -= lineHeight;
  });

  currentY -= 120;

  // Amount in words with enhanced styling
  const total = grandTotal;
  const words = numberToIndianCurrencyWords(total).toUpperCase();

  page.drawRectangle({
    x: margin,
    y: currentY - 30,
    width: width - 2 * margin,
    height: 30,
    color: colors.secondary,
    borderColor: colors.border,
    borderWidth: 1,
  });

  text(`Amount in words: ${words}`, margin + 10, currentY - 20, {
    size: 10,
    bold: true,
    color: colors.text,
  });

  currentY -= 50;

  // Enhanced Footer & Terms
  function drawFooter(pg: any, pageIndex: number, pageCount: number) {
    const pw = pg.getSize().width;
    const ph = pg.getSize().height;
    const baseY = 90;

    // Enhanced footer background
    pg.drawRectangle({
      x: 0,
      y: 0,
      width: pw,
      height: baseY + 80,
      color: colors.white,
      borderColor: colors.border,
      borderWidth: 1,
    });

    // Enhanced separator line
    pg.drawRectangle({
      x: 40,
      y: baseY + 50,
      width: pw - 80,
      height: 2,
      color: colors.primary,
    });

    // Enhanced terms section
    pg.drawText("TERMS & CONDITIONS", {
      x: 50,
      y: baseY + 35,
      size: 11,
      font: boldFont,
      color: colors.primary,
    });

    // Render multiline Terms & Conditions with wrapping (avoid overlapping signature box on right)
    const rawTerms = (SHOP_DETAILS.terms || "").replace(/\r\n/g, "\n");
    const termsLines = rawTerms.split(/\n/);
    const startX = 50;
    const startY = baseY + 18; // first line baseline
    const lineGap = 10; // vertical gap between lines
    const maxWidth = pw - 420; // leave space before signature box (~320 width + margin)

    const wrapLine = (line: string): string[] => {
      const words = line.split(/\s+/);
      const wrapped: string[] = [];
      let current = "";
      words.forEach((w) => {
        const tentative = current ? current + " " + w : w;
        const width = font.widthOfTextAtSize(sanitizeText(tentative), 9);
        if (width > maxWidth && current) {
          wrapped.push(current);
          current = w;
        } else {
          current = tentative;
        }
      });
      if (current) wrapped.push(current);
      return wrapped;
    };

    let rendered = 0;
    for (const ln of termsLines) {
      const segments = wrapLine(ln.trim());
      for (const seg of segments) {
        const y = startY - rendered * lineGap;
        // Stop before overlapping page number area (approx y < baseY - 5)
        if (y < baseY - 5) break;
        pg.drawText(sanitizeText(seg), {
          x: startX,
          y,
          size: 9,
          font,
          color: colors.text,
        });
        rendered++;
      }
    }

    // Enhanced store signature section
    pg.drawRectangle({
      x: pw - 320,
      y: baseY + 10,
      width: 250,
      height: 40,
      color: colors.secondary,
      borderColor: colors.primary,
      borderWidth: 1,
    });

    pg.drawText(`FOR ${SHOP_DETAILS.shopName}`, {
      x: pw - 310,
      y: baseY + 35,
      size: 10,
      font: boldFont,
      color: colors.primary,
    });

    pg.drawText("Authorised Signatory", {
      x: pw - 310,
      y: baseY + 18,
      size: 9,
      font,
      color: colors.text,
    });

    // Enhanced page number
    pg.drawRectangle({
      x: pw - 140,
      y: 40,
      width: 120,
      height: 25,
      color: colors.primary,
    });

    pg.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
      x: pw - 130,
      y: 48,
      size: 9,
      font: boldFont,
      color: colors.white,
    });

    // Company branding footer
    const footerText = `${SHOP_DETAILS.shopName} | ${SHOP_DETAILS.phone}`;
    pg.drawText(footerText, {
      x: 50,
      y: 25,
      size: 8,
      font,
      color: colors.primary,
    });

    const currentDate = new Date().toLocaleDateString();
    pg.drawText(`Generated: ${currentDate}`, {
      x: pw - 200,
      y: 25,
      size: 8,
      font,
      color: colors.text,
    });
  }
  // Draw footers on all pages
  const pages = pdfDoc.getPages();
  pages.forEach((p: any, idx: number) => drawFooter(p, idx, pages.length));

  return await pdfDoc.save();
}

async function fetchLogoBytes(asset: any): Promise<Uint8Array> {
  if (typeof asset === "number") {
    const { Asset } = await import("expo-asset");
    const resolved = Asset.fromModule(asset);
    if (!resolved.localUri) await resolved.downloadAsync();
    if (!resolved.localUri) throw new Error("Logo asset not available");
    const b64 = await FileSystem.readAsStringAsync(resolved.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }
  if (typeof asset === "string") {
    const b64 = await FileSystem.readAsStringAsync(asset, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }
  throw new Error("Unsupported logo asset format");
}

export async function writePdfToFile(
  pdfBytes: Uint8Array,
  filename?: string
): Promise<string> {
  const name = filename || `invoice-${Date.now()}.pdf`;
  const filePath = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(
    filePath,
    Buffer.from(pdfBytes).toString("base64"),
    { encoding: FileSystem.EncodingType.Base64 }
  );
  return filePath;
}

export async function uploadPdfToSupabase(
  filePath: string,
  bucket: string = INVOICE_PDF_BUCKET
): Promise<{ storagePath: string; publicUrl?: string }> {
  const fileBytesB64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileBytes = Buffer.from(fileBytesB64, "base64");
  const path = `${generateUniqueId()}.pdf`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBytes, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function sharePdf(filePath: string) {
  if (!(await Sharing.isAvailableAsync())) return;
  await shareAsync(filePath);
}
