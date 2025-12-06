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
    hsn?: string;
  }>; // optional order items
  logo?: any; // require() of logo for watermark
}

async function fetchOrderItems(order_id?: string | null) {
  if (!order_id) return [] as any[];
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "item_name, quantity, unit_price, gst_percent, tax_amount, total_price ,inventory!inner (hsn)"
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
    hsn: d.inventory?.hsn || "9018",
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

  // Page dimensions and spacing constants
  const PAGE_WIDTH = 842;
  const PAGE_HEIGHT = 1191;
  const MARGIN = 40;
  const LINE_HEIGHT = 16;
  const ROW_HEIGHT = 22;
  const HEADER_HEIGHT = 80;
  const FOOTER_HEIGHT = 170; // Increased to accommodate footer content
  const TABLE_HEADER_HEIGHT = 25;
  const SUMMARY_HEIGHT = 120;
  const BANK_DETAILS_HEIGHT = 100;
  const AMOUNT_IN_WORDS_HEIGHT = 30;

  // Calculate usable page height for content
  const USABLE_HEIGHT = PAGE_HEIGHT - FOOTER_HEIGHT;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
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

  // If no orderItems provided, attempt fetch from order_id
  if (!orderItems.length) {
    orderItems = await fetchOrderItems(invoice.order_id as any);
  }

  // Watermark setup
  let watermarkImage: any = null;
  let watermarkDimensions: { width: number; height: number } | null = null;

  if (logo) {
    try {
      const logoBytes = await fetchLogoBytes(logo);
      if (logoBytes.length) {
        watermarkImage = await pdfDoc.embedPng(logoBytes);
        const scale = Math.min(
          (width * 0.65) / watermarkImage.width,
          (height * 0.65) / watermarkImage.height
        );
        watermarkDimensions = {
          width: watermarkImage.width * scale,
          height: watermarkImage.height * scale,
        };
      }
    } catch (e) {
      console.warn("Invoice PDF watermark failed", e);
    }
  }

  // Helper function to draw watermark on any page
  function drawWatermark(targetPage: any) {
    if (watermarkImage && watermarkDimensions) {
      targetPage.drawImage(watermarkImage, {
        x: (width - watermarkDimensions.width) / 2,
        y: (height - watermarkDimensions.height) / 2,
        width: watermarkDimensions.width,
        height: watermarkDimensions.height,
        opacity: 0.1,
      });
    }
  }

  // Enhanced text function with better styling
  function text(
    txt: string,
    x: number,
    y: number,
    opts: any = {},
    targetPage = page
  ) {
    const sanitizedText = sanitizeText(txt);
    targetPage.drawText(sanitizedText, {
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
    thickness = 1,
    targetPage = page
  ) {
    targetPage.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color,
    });
  }

  // Helper function to create a new page with consistent setup
  function createNewPage() {
    const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawWatermark(newPage);
    return newPage;
  }

  // Helper function to draw table header
  function drawTableHeader(targetPage: any, y: number) {
    const tableX = MARGIN;
    const tableWidth = width - 2 * MARGIN;
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

    // Table header background
    targetPage.drawRectangle({
      x: tableX,
      y: y - TABLE_HEADER_HEIGHT,
      width: tableWidth,
      height: TABLE_HEADER_HEIGHT,
      color: colors.primary,
    });

    // Header shadow effect
    targetPage.drawRectangle({
      x: tableX,
      y: y - TABLE_HEADER_HEIGHT - 2,
      width: tableWidth,
      height: 2,
      color: colors.accent,
    });

    let runningX = tableX + 8;
    headers.forEach((header, i) => {
      text(
        header,
        runningX,
        y - 16,
        {
          size: 10,
          bold: true,
          color: colors.white,
        },
        targetPage
      );
      runningX += tableWidth * colPerc[i];
    });

    return y - TABLE_HEADER_HEIGHT;
  }

  let cursorY = height - 30;

  // Draw header section on first page
  function drawHeaderSection() {
    // Professional header section with gradient-like effect
    // Main header background
    page.drawRectangle({
      x: 0,
      y: height - HEADER_HEIGHT,
      width: width,
      height: HEADER_HEIGHT,
      color: colors.primary,
    });

    // Secondary gradient effect
    page.drawRectangle({
      x: 0,
      y: height - HEADER_HEIGHT + 40,
      width: width,
      height: 40,
      color: colors.accent,
      opacity: 0.3,
    });

    // Company name in header
    text(SHOP_DETAILS.shopName, MARGIN, height - 35, {
      size: 24,
      bold: true,
      color: colors.white,
    });

    text("INVOICE", width - 140, height - 35, {
      size: 20,
      bold: true,
      color: colors.white,
    });

    // Draw watermark after header backgrounds
    drawWatermark(page);

    return height - HEADER_HEIGHT - 20;
  }

  cursorY = drawHeaderSection();

  // Invoice details section
  const detailsBoxHeight = 60;
  page.drawRectangle({
    x: MARGIN,
    y: cursorY - detailsBoxHeight,
    width: width - 2 * MARGIN,
    height: detailsBoxHeight,
    color: colors.secondary,
    borderColor: colors.border,
    borderWidth: 1,
  });

  // Invoice number and date
  text("Invoice No:", MARGIN + 10, cursorY - 20, {
    size: 11,
    bold: true,
    color: colors.primary,
  });
  const invoiceNumber = invoice.invoice_number;
  if (invoiceNumber.length > 25) {
    const chunks = invoiceNumber.match(/.{1,25}/g) || [invoiceNumber];
    chunks.forEach((chunk, index) => {
      text(chunk, MARGIN + 100, cursorY - 20 - index * 12, {
        size: 11,
        color: colors.text,
      });
    });
  } else {
    text(invoiceNumber, MARGIN + 100, cursorY - 20, {
      size: 11,
      color: colors.text,
    });
  }

  if (invoice.orders?.purchase_order_number) {
    text("PO No:", MARGIN + 10, cursorY - 35, {
      size: 11,
      bold: true,
      color: colors.primary,
    });
    const purchaseOrderNumber = invoice.orders?.purchase_order_number;
    text(purchaseOrderNumber, MARGIN + 100, cursorY - 35, {
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

  // Shop details section
  const shopBoxHeight = 100;
  page.drawRectangle({
    x: MARGIN,
    y: cursorY - shopBoxHeight,
    width: width - 2 * MARGIN,
    height: shopBoxHeight,
    color: colors.white,
    borderColor: colors.primary,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: MARGIN,
    y: cursorY - 25,
    width: width - 2 * MARGIN,
    height: 25,
    color: colors.primary,
  });

  text("COMPANY DETAILS", MARGIN + 10, cursorY - 18, {
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
    text(line, MARGIN + 10, boxTextY, {
      size: 10,
      color: colors.text,
      bold: index === 0,
    });
    boxTextY -= LINE_HEIGHT;
  });

  cursorY -= shopBoxHeight + 20;

  // Customer information section with multiline wrapping
  const colWidth = (width - 2 * MARGIN - 10) / 2;

  // Helper: wrap lines to fit column width
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
    customer?.state || "",
    `GSTIN: ${customer?.gstin || ""}`,
  ].filter((l) => l && l.trim() !== "");

  const shippingRaw = [
    customerName,
    customer?.company_name || "",
    customer?.phone || "",
    customer?.email || "",
    (customer as any)?.shipping_address || customer?.billing_address || "",
    customer?.state || "",
    `GSTIN: ${customer?.gstin || ""}`,
  ].filter((l) => l && l.trim() !== "");

  const innerPadding = 10;
  const textWidthLimit = colWidth - innerPadding * 2;
  const fontSize = 10;
  const billingLines = wrapText(billingRaw, textWidthLimit, fontSize);
  const shippingLines = wrapText(shippingRaw, textWidthLimit, fontSize);
  const maxLines = Math.max(billingLines.length, shippingLines.length);
  const minAddrHeight = 110;
  const dynamicHeight = 25 + 15 + maxLines * LINE_HEIGHT + 15;
  const addrHeight = Math.max(minAddrHeight, dynamicHeight);

  // Bill To box
  page.drawRectangle({
    x: MARGIN,
    y: cursorY - addrHeight,
    width: colWidth,
    height: addrHeight,
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: MARGIN,
    y: cursorY - 25,
    width: colWidth,
    height: 25,
    color: colors.secondary,
  });
  text("BILL TO", MARGIN + innerPadding, cursorY - 18, {
    size: 11,
    bold: true,
    color: colors.primary,
  });

  // Ship To box
  const shipX = MARGIN + colWidth + 10;
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
    text(line, MARGIN + innerPadding, billY, {
      size: fontSize,
      color: colors.text,
      bold: idx === 0,
    });
    billY -= LINE_HEIGHT;
  });
  shippingLines.forEach((line, idx) => {
    text(line, shipX + innerPadding, shipY, {
      size: fontSize,
      color: colors.text,
      bold: idx === 0,
    });
    shipY -= LINE_HEIGHT;
  });

  cursorY -= addrHeight + 30;

  // Enhanced items table with smart pagination
  const tableX = MARGIN;
  const tableWidth = width - 2 * MARGIN;
  const colPerc = [0.06, 0.32, 0.1, 0.08, 0.14, 0.14, 0.08, 0.14];

  let currentY = cursorY;
  let currentPage = page;
  let pageIndex = 0;

  // Draw initial table header
  currentY = drawTableHeader(currentPage, currentY);

  // Prepare items data
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

  // Calculate minimum space needed for the last page footer content
  const LAST_PAGE_FOOTER_SPACE =
    SUMMARY_HEIGHT + BANK_DETAILS_HEIGHT + AMOUNT_IN_WORDS_HEIGHT + 50; // Extra margin

  // Process each item with smart pagination
  for (const item of items) {
    // Calculate space needed: current row + totals row + footer content (if last items)
    const isLastItem = index === items.length - 1;
    const spaceNeeded =
      ROW_HEIGHT +
      TABLE_HEADER_HEIGHT +
      (isLastItem ? LAST_PAGE_FOOTER_SPACE : 100);

    // Check if we need a new page
    if (currentY - spaceNeeded < FOOTER_HEIGHT) {
      // Add "continued" text to current page
      text(
        "Continued on next page...",
        width - 200,
        FOOTER_HEIGHT + 10,
        {
          size: 9,
          color: colors.primary,
        },
        currentPage
      );

      // Create new page
      currentPage = createNewPage();
      pageIndex++;
      currentY = USABLE_HEIGHT - 50; // Start with some top margin

      // Draw table header on new page
      currentY = drawTableHeader(currentPage, currentY);
    }

    // Draw item row with alternating colors
    const rowColor = index % 2 === 0 ? colors.white : colors.secondary;

    currentPage.drawRectangle({
      x: tableX,
      y: currentY - ROW_HEIGHT,
      width: tableWidth,
      height: ROW_HEIGHT,
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
      text(
        data,
        cellX,
        currentY - 14,
        {
          size: 9,
          color: colors.text,
          bold: i === rowData.length - 1,
        },
        currentPage
      );
      cellX += tableWidth * colPerc[i];
    });

    currentY -= ROW_HEIGHT;
    totalQty += item.quantity;
    totalGst += gstAmt;
    totalAmt += total;
  }

  // Draw totals row
  currentPage.drawRectangle({
    x: tableX,
    y: currentY - TABLE_HEADER_HEIGHT,
    width: tableWidth,
    height: TABLE_HEADER_HEIGHT,
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
    text(
      data,
      totalX,
      currentY - 16,
      {
        size: 10,
        bold: true,
        color: colors.white,
      },
      currentPage
    );
    totalX += tableWidth * colPerc[i];
  });
  currentY -= 50;

  // Summary and bank details section
  const summaryWidth = 300;
  const summaryX = width - summaryWidth - MARGIN;

  // Summary box
  currentPage.drawRectangle({
    x: summaryX,
    y: currentY - 100,
    width: summaryWidth,
    height: 100,
    color: colors.secondary,
    borderColor: colors.primary,
    borderWidth: 1,
  });

  currentPage.drawRectangle({
    x: summaryX,
    y: currentY - 25,
    width: summaryWidth,
    height: 25,
    color: colors.primary,
  });

  text(
    "PAYMENT SUMMARY",
    summaryX + 10,
    currentY - 16,
    {
      size: 11,
      bold: true,
      color: colors.white,
    },
    currentPage
  );

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
    text(
      item[0],
      summaryX + 10,
      summaryY,
      {
        size: isLast ? 11 : 10,
        bold: isLast,
        color: colors.text,
      },
      currentPage
    );
    text(
      item[1],
      summaryX + summaryWidth - 100,
      summaryY,
      {
        size: isLast ? 11 : 10,
        bold: true,
        color: isLast ? colors.primary : colors.text,
      },
      currentPage
    );
    summaryY -= LINE_HEIGHT + 2;
  });

  // Bank details section
  currentPage.drawRectangle({
    x: MARGIN,
    y: currentY - 100,
    width: summaryX - MARGIN - 20,
    height: 100,
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });

  currentPage.drawRectangle({
    x: MARGIN,
    y: currentY - 25,
    width: summaryX - MARGIN - 20,
    height: 25,
    color: colors.secondary,
  });

  text(
    "BANK DETAILS",
    MARGIN + 10,
    currentY - 16,
    {
      size: 11,
      bold: true,
      color: colors.primary,
    },
    currentPage
  );

  let bankY = currentY - 40;
  const bankDetails = [
    `Account: ${SHOP_DETAILS.bankAccountNumber}`,
    `IFSC: ${SHOP_DETAILS.bankIFSC}`,
    `Bank: ${SHOP_DETAILS.bankName}`,
    `Branch: ${SHOP_DETAILS.bankBranch}`,
  ];

  bankDetails.forEach((detail) => {
    text(
      detail,
      MARGIN + 10,
      bankY,
      { size: 10, color: colors.text },
      currentPage
    );
    bankY -= LINE_HEIGHT;
  });

  currentY -= 120;

  // Amount in words
  const total = grandTotal;
  const words = numberToIndianCurrencyWords(total).toUpperCase();

  currentPage.drawRectangle({
    x: MARGIN,
    y: currentY - 30,
    width: width - 2 * MARGIN,
    height: 30,
    color: colors.secondary,
    borderColor: colors.border,
    borderWidth: 1,
  });

  text(
    `Amount in words: ${words}`,
    MARGIN + 10,
    currentY - 20,
    {
      size: 10,
      bold: true,
      color: colors.text,
    },
    currentPage
  );

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

    // Render multiline Terms & Conditions with wrapping
    const rawTerms = (SHOP_DETAILS.terms || "").replace(/\r\n/g, "\n");
    const termsLines = rawTerms.split(/\n/);
    const startX = 50;
    const startY = baseY + 18;
    const lineGap = 10;
    const maxWidth = pw - 420;

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

    pg.drawText(
      `Generated: ${new Date(invoice.created_at).toLocaleDateString()}`,
      {
        x: pw - 200,
        y: 25,
        size: 8,
        font,
        color: colors.text,
      }
    );
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
