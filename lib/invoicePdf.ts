import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { shareAsync } from "expo-sharing";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";
import { Database } from "@/types/database.types";
import { Buffer } from "buffer";
import { INVOICE_PDF_BUCKET, SHOP_DETAILS } from "./invoiceConfig";
import { numberToIndianCurrencyWords } from "./numberToWords";

export interface InvoicePdfParams {
  invoice: Database["public"]["Tables"]["invoices"]["Row"];
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

// Number to words (simple Indian format) – minimal replacement of external dependency
function numberToWords(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + convert(n % 10000000) : "")
    );
  }
  return convert(amount) || "Zero";
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
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([842, 1191]);
  let { width, height } = page.getSize();

  // If no orderItems provided, attempt fetch from order_id
  if (!orderItems.length) {
    orderItems = await fetchOrderItems(invoice.order_id as any);
  }

  // Watermark
  if (logo) {
    try {
      const logoBytes = await fetchLogoBytes(logo);
      const embedded = await pdfDoc.embedPng(logoBytes);
      const scale = Math.min(
        (width * 0.4) / embedded.width,
        (height * 0.4) / embedded.height
      );
      const wmWidth = embedded.width * scale;
      const wmHeight = embedded.height * scale;
      page.drawImage(embedded, {
        x: (width - wmWidth) / 2,
        y: (height - wmHeight) / 2,
        width: wmWidth,
        height: wmHeight,
        opacity: 0.08,
      });
    } catch {}
  }

  let cursorY = height - 40;
  const lineHeight = 16;
  function text(txt: string, x: number, y: number, opts: any = {}) {
    page.drawText(txt, {
      x,
      y,
      size: opts.size || 10,
      font: opts.bold ? boldFont : font,
      color: opts.color || rgb(0, 0, 0),
    });
  }
  function hLine(y: number) {
    page.drawLine({
      start: { x: 40, y },
      end: { x: width - 40, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  // Header table (Invoice No / Date)
  text("Invoice No.:", 50, cursorY, { size: 11 });
  text(invoice.invoice_number, 140, cursorY, { size: 11, bold: true });
  text("Date:", 50, cursorY - lineHeight, { size: 11 });
  text(
    new Date(invoice.issue_date).toLocaleDateString(),
    140,
    cursorY - lineHeight,
    { size: 11 }
  );
  cursorY -= 50;

  // Shop banner
  page.drawRectangle({
    x: 40,
    y: cursorY - 30,
    width: width - 80,
    height: 30,
    color: rgb(0.04, 0.32, 0.55),
  });
  text(SHOP_DETAILS.shopName, 0, cursorY - 20, {
    size: 16,
    bold: true,
    color: rgb(1, 1, 1),
  });
  cursorY -= 40;

  // Shop details box
  const shopBoxHeight = 90;
  page.drawRectangle({
    x: 40,
    y: cursorY - shopBoxHeight,
    width: width - 80,
    height: shopBoxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  let boxTextY = cursorY - 18;
  const shopLines = [
    `Address: ${SHOP_DETAILS.addressLine1}`,
    SHOP_DETAILS.addressLine2,
    `Phone: ${SHOP_DETAILS.phone}`,
    `Email: ${SHOP_DETAILS.email}`,
    `GSTIN: ${SHOP_DETAILS.gstin}`,
    `State: ${SHOP_DETAILS.state}`,
  ];
  shopLines.forEach((l) => {
    text(l, 50, boxTextY);
    boxTextY -= lineHeight;
  });
  cursorY -= shopBoxHeight + 20;

  // Billing / Shipping (using same customer info)
  const colWidth = (width - 80) / 2;
  const addrHeight = 120;
  page.drawRectangle({
    x: 40,
    y: cursorY - addrHeight,
    width: colWidth,
    height: addrHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawRectangle({
    x: 40 + colWidth,
    y: cursorY - addrHeight,
    width: colWidth,
    height: addrHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  text("Bill To:", 50, cursorY - 18, { bold: true });
  text("Shipping To:", 50 + colWidth, cursorY - 18, { bold: true });
  const customerName = customer?.name || "Customer";
  const custLines = [
    customerName,
    customer?.company_name || "",
    customer?.phone || "",
    customer?.email || "",
  ];
  let billY = cursorY - 36;
  let shipY = cursorY - 36;
  custLines.forEach((l) => {
    if (l) {
      text(l, 50, billY);
      billY -= lineHeight;
      text(l, 50 + colWidth, shipY);
      shipY -= lineHeight;
    }
  });
  cursorY -= addrHeight + 20;

  // Items table header
  const tableX = 40;
  const tableWidth = width - 80;
  const headers = [
    "SL",
    "Item name",
    "HSN",
    "Qnt",
    "Price/Unit",
    "Gross Amt",
    "GST",
    "Amount",
  ];
  const colPerc = [0.06, 0.3, 0.1, 0.07, 0.14, 0.14, 0.07, 0.12];
  let currentY = cursorY;
  page.drawRectangle({
    x: tableX,
    y: currentY - 20,
    width: tableWidth,
    height: 20,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  let runningX = tableX + 4;
  headers.forEach((h, i) => {
    text(h, runningX, currentY - 14, { size: 9, bold: true });
    runningX += tableWidth * colPerc[i];
  });
  currentY -= 20;

  // Data rows (using orderItems if provided; else single summary row)
  const items = orderItems.length
    ? orderItems
    : [
        {
          item_name: "Subtotal",
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
  for (const it of items) {
    const rowHeight = 20;
    if (currentY - rowHeight < 120) {
      // pagination threshold
      // Footer continued marker
      text("Continued on next page...", width - 200, 60, { size: 8 });
      // New page
      page = pdfDoc.addPage([842, 1191]);
      ({ width, height } = page.getSize());
      currentY = height - 200; // leave space for header repetition minimal
      // Repeat table header
      page.drawRectangle({
        x: tableX,
        y: currentY - 20,
        width: tableWidth,
        height: 20,
        color: rgb(0.9, 0.9, 0.9),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      let hx = tableX + 4;
      headers.forEach((h, i) => {
        text(h, hx, currentY - 14, { size: 9, bold: true });
        hx += tableWidth * colPerc[i];
      });
      currentY -= 20;
    }
    page.drawRectangle({
      x: tableX,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    const gross = it.unit_price * it.quantity;
    const gstAmt = it.tax_amount;
    const total = it.total_price;
    const cols = [
      String(++index),
      it.item_name,
      "-",
      String(it.quantity),
      `₹ ${it.unit_price.toFixed(2)}`,
      `₹ ${gross.toFixed(2)}`,
      `${it.gst_percent}%`,
      `₹ ${total.toFixed(2)}`,
    ];
    let cellX = tableX + 4;
    cols.forEach((c, i) => {
      text(c, cellX, currentY - 14, { size: 8 });
      cellX += tableWidth * colPerc[i];
    });
    currentY -= rowHeight;
    totalQty += it.quantity;
    totalGst += gstAmt;
    totalAmt += total;
  }

  // Totals row
  page.drawRectangle({
    x: tableX,
    y: currentY - 20,
    width: tableWidth,
    height: 20,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  let totalX = tableX + 4;
  const totalCols = [
    "Total",
    String(totalQty),
    "",
    "",
    "",
    "",
    `₹ ${totalGst.toFixed(2)}`,
    `₹ ${totalAmt.toFixed(2)}`,
  ];
  totalCols.forEach((c, i) => {
    text(c, totalX, currentY - 14, { size: 8, bold: i === 0 });
    totalX += tableWidth * colPerc[i];
  });
  currentY -= 40;

  // Bank + Tax (simplified)
  text(`BANK A/C NO. ${SHOP_DETAILS.bankAccountNumber}`, 50, currentY, {
    size: 10,
  });
  text(`IFSC - ${SHOP_DETAILS.bankIFSC}`, 50, currentY - lineHeight, {
    size: 10,
  });
  text(`BRANCH - ${SHOP_DETAILS.bankBranch}`, 50, currentY - 2 * lineHeight, {
    size: 10,
  });
  text(`BANK - ${SHOP_DETAILS.bankName}`, 50, currentY - 3 * lineHeight, {
    size: 10,
  });
  currentY -= 70;

  const total = (invoice.amount || 0) + (invoice.tax || 0);
  const words = numberToIndianCurrencyWords(total).toUpperCase();
  text(`Amount in words: ${words}.`, 50, currentY, { size: 10 });
  currentY -= 40;

  // Footer & Terms
  function drawFooter(pg: any, pageIndex: number, pageCount: number) {
    const pw = pg.getSize().width;
    const ph = pg.getSize().height;
    const baseY = 90;
    pg.drawLine({
      start: { x: 40, y: baseY + 50 },
      end: { x: pw - 40, y: baseY + 50 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    pg.drawText(`# Terms & Conditions: ${SHOP_DETAILS.terms}`, {
      x: 50,
      y: baseY + 30,
      size: 9,
      font,
    });
    pg.drawText(`FOR ${SHOP_DETAILS.shopName}`, {
      x: pw - 300,
      y: baseY + 30,
      size: 10,
      font: boldFont,
    });
    pg.drawText("Authorised Signatory", {
      x: pw - 300,
      y: baseY + 10,
      size: 10,
      font,
    });
    pg.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
      x: pw - 140,
      y: 60,
      size: 9,
      font,
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
  const path = `${uuidv4()}.pdf`;
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
