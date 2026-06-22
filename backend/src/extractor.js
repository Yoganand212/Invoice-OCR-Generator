"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractInvoiceData = extractInvoiceData;
function extractInvoiceData(text) {
    const result = {
        invoiceNumber: null,
        invoiceDate: null,
        vendorName: null,
        gstNumber: null,
        totalAmount: null,
    };
    // Basic normalization
    const normalizedText = text.replace(/\n/g, ' ');
    // 1. Extract Invoice Number
    // Looks for common patterns like INV-001, Invoice #1234, Invoice No: 5678
    const invoiceNumRegex = /(?:invoice\s*(?:no|number|#)?\s*[:.-]?\s*)([A-Z0-9-]+)/i;
    const invMatch = normalizedText.match(invoiceNumRegex);
    if (invMatch && invMatch[1]) {
        result.invoiceNumber = invMatch[1].trim();
    }
    // 2. Extract Invoice Date
    // Looks for common date patterns DD/MM/YYYY, MM-DD-YYYY, etc.
    const dateRegex = /(?:date\s*[:.-]?\s*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i;
    const dateMatch = normalizedText.match(dateRegex);
    if (dateMatch && dateMatch[1]) {
        result.invoiceDate = dateMatch[1].trim();
    }
    // 3. Extract GST Number
    // Indian GST number format is generally 15 characters: 2 numbers, 10 chars (PAN), 1 num, Z, 1 char/num
    const gstRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i;
    const gstMatch = normalizedText.match(gstRegex);
    if (gstMatch && gstMatch[1]) {
        result.gstNumber = gstMatch[1].toUpperCase();
    }
    // 4. Extract Total Amount
    // Looks for "Total", "Amount", "Grand Total" followed by a number
    const totalRegex = /(?:grand\s+total|total\s+amount|total|amount)\s*[:.-]?\s*(?:rs\.?|inr|\$)?\s*([\d,]+\.?\d*)/i;
    const totalMatch = normalizedText.match(totalRegex);
    if (totalMatch && totalMatch[1]) {
        result.totalAmount = totalMatch[1].trim();
    }
    // 5. Extract Vendor Name (Heuristic: Top of document usually)
    // This is a naive approach: grab the first line or first few words
    // Better done in Layout Analysis (Phase 5), but we do a basic one here
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
        // Exclude generic header words if possible, but taking the first line is standard fallback
        result.vendorName = lines[0];
    }
    return result;
}
