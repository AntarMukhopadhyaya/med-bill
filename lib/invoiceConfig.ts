// Centralized configuration for invoice PDF generation & storage
export const INVOICE_PDF_BUCKET = "invoices";

// Shop / company details (placeholder values - adjust to real data or fetch from a table)
export const SHOP_DETAILS = {
  shopName: "YAVA ACCESSORIES OPC PVT. LTD.",
  addressLine1: "123 Business Park Road",
  addressLine2: "Paschim Bardhaman, PIN 713340",
  phone: "+91-9000000000",
  email: "contact@yavaaccessories.com",
  gstin: "22AAAAA0000A1Z5",
  state: "West Bengal",
  bankAccountNumber: "123456789012",
  bankIFSC: "HDFC0000001",
  bankBranch: "Main Branch",
  bankName: "HDFC Bank",
  terms: `We declare that this invoice shows the actual price of the
          goods described and that all particulars are true and correct.
          NOTE:- The invoice amount is to be paid to the mentioned
          company bank account in this invoice. Amount paid to any
          other account will not be accepted..`,
};
