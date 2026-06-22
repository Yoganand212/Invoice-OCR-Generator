export function extractInvoiceData(text: string) {
  const result: {
    invoiceNumber: string | null;
    invoiceDate: string | null;
    vendorName: string | null;
    gstNumber: string | null;
    totalAmount: string | null;
  } = {
    invoiceNumber: null,
    invoiceDate: null,
    vendorName: null,
    gstNumber: null,
    totalAmount: null,
  };

  // Normalize: collapse multiple spaces, keep newlines
  const normalizedText = text.replace(/[ \t]+/g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const singleLine = normalizedText.replace(/\n/g, ' ');

  // ─── 1. INVOICE NUMBER ───────────────────────────────────────────────
  const invoiceNumPatterns = [
    /(?:invoice\s*(?:no\.?|na\.?|n[o0]\.?|number|#|num))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:bill\s*(?:no\.?|na\.?|number|#))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:invoice\s*#)\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:inv\.?\s*(?:no\.?|na\.?|#))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
  ];

  for (const regex of invoiceNumPatterns) {
    const match = singleLine.match(regex);
    if (match && match[1]) {
      const val = match[1].trim();
      if (!/^(invoice|date|no|na|number|tax|the|details)$/i.test(val)) {
        result.invoiceNumber = val;
        break;
      }
    }
  }

  // ─── 2. INVOICE DATE ────────────────────────────────────────────────
  // Extremely robust date matching: find all dates and pick the first one
  const dateRegex = /\b(\d{1,2}[\/.\\\-]\d{1,2}[\/.\\\-]\d{2,4})\b/g;
  const wordDateRegex = /\b(\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{2,4})\b/ig;
  
  const allDates: string[] = [];
  let m;
  while ((m = dateRegex.exec(singleLine)) !== null) allDates.push(m[1]);
  while ((m = wordDateRegex.exec(singleLine)) !== null) allDates.push(m[1]);

  if (allDates.length > 0) {
    // Prioritize a date that appears near the word "date"
    const dateLine = lines.find(l => /date/i.test(l) && (dateRegex.test(l) || wordDateRegex.test(l)));
    if (dateLine) {
      const lm1 = dateLine.match(/\b(\d{1,2}[\/.\\\-]\d{1,2}[\/.\\\-]\d{2,4})\b/);
      const lm2 = dateLine.match(/\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})\b/i);
      result.invoiceDate = (lm1 && lm1[1]) || (lm2 && lm2[1]) || allDates[0];
    } else {
      result.invoiceDate = allDates[0];
    }
  }

  // ─── 3. TOTAL AMOUNT ────────────────────────────────────────────────
  // Find all monetary values in the document
  const amountRegexGlobal = /(?:[₹£€$]|Rs\.?\s*|INR\.?\s*)?([\d,]+\.\d{2})\b/g;
  const allAmounts: number[] = [];
  let matchAmount;
  while ((matchAmount = amountRegexGlobal.exec(singleLine)) !== null) {
    const val = parseFloat(matchAmount[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      allAmounts.push(val);
    }
  }

  // Find labels
  const totalLabels = /\b(rounded\s*total|grand\s*total|total\s*payable|net\s*payable|invoice\s*total|amount\s*payable)\b/i;
  const reversedLines = [...lines].reverse();
  
  for (const line of reversedLines) {
    if (totalLabels.test(line)) {
      // Find the LAST amount on this line
      const amountsOnLine = [...line.matchAll(/(?:[₹£€$]|Rs\.?\s*|INR\.?\s*)?([\d,]+\.\d{2})\b/g)];
      if (amountsOnLine.length > 0) {
        result.totalAmount = amountsOnLine[amountsOnLine.length - 1][1];
        break;
      }
    }
  }

  // Fallback: Highest amount found in the document
  if (!result.totalAmount && allAmounts.length > 0) {
    const maxAmount = Math.max(...allAmounts);
    // Format to 2 decimal places
    result.totalAmount = maxAmount.toFixed(2);
  }

  // ─── 4. GST / VAT NUMBER ───────────────────────────────────────────
  // GSTINs are often 2 per invoice (Seller and Buyer). Seller's is usually first.
  const gstinRegexGlobal = /\b([0-9O]{2}[A-Z]{5}[0-9O]{4}[A-Z][A-Z0-9][A-Z][A-Z0-9])\b/ig;
  const gstins: string[] = [];
  let gstinMatch;
  while ((gstinMatch = gstinRegexGlobal.exec(singleLine)) !== null) {
    gstins.push(gstinMatch[1].toUpperCase());
  }

  if (gstins.length > 0) {
    // Clean up OCR misreads
    let bestGstin = gstins[0].replace(/\s/g, '');
    bestGstin = bestGstin.replace(/^([O0])([O0])/, (_, a, b) => 
      (a === 'O' ? '0' : a) + (b === 'O' ? '0' : b)
    );
    result.gstNumber = bestGstin;
  }

  // ─── 5. VENDOR NAME ─────────────────────────────────────────────────
  function isNoiseLine(line: string): boolean {
    if (line.length < 4) return true;
    const alphanumCount = (line.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphanumCount / line.length < 0.5) return true;
    if (/^[\d\s,.\-\/]+$/.test(line)) return true;
    return false;
  }

  const genericHeaders = /^(tax\s*invoice|invoice|original|duplicate|copy|proforma|receipt|quotation|estimate|gst|gstin|date|sr|sn|bill\s*to|ship\s*to)$/i;

  // Strategy A: Explicit Labels
  const vendorLabelPatterns = [
    /(?:sold\s+by|seller|from|vendor|supplier|company\s*name)\s*[:.;\-]?\s*(.+)/i,
  ];
  for (const regex of vendorLabelPatterns) {
    const match = singleLine.match(regex);
    if (match && match[1]) {
      const name = match[1].split(/[,\n|]/)[0].trim();
      if (name.length > 2 && !isNoiseLine(name)) {
        result.vendorName = name;
      }
    }
  }

  // Strategy B: Company suffixes
  if (!result.vendorName) {
    const companyRegex = /\b([A-Z][A-Za-z0-9&.\s']{2,}(?:Pvt\.?\s*Ltd\.?|Private\s*Limited|Ltd\.?|Limited|LLC|Inc\.?|Corporation|Corp\.?|LLP|Co\.?\s*Ltd\.?|Enterprises|Industries|Services|Solutions|Technologies|Tech|Traders|Trading|Associates|Distributors|Exports|Imports|Agencies|Mart|Store|Stores|Shop|Emporium))\b/i;
    // Look line by line first so we don't accidentally grab "Date" on the same line
    for (const line of lines) {
      const match = line.match(companyRegex);
      if (match && match[1]) {
        // Only accept if the matched part is a significant chunk of the line
        let cleanName = match[1].trim();
        // Remove trailing " invoice No:" junk if it got merged
        cleanName = cleanName.replace(/(?:\s+invoice\s+no.*|\s+date.*|\s+gst.*)$/i, '');
        // Remove leading noise like "] '.I "
        cleanName = cleanName.replace(/^[^a-zA-Z0-9]+/, '');
        if (cleanName.length > 3) {
          result.vendorName = cleanName;
          break;
        }
      }
    }
  }

  // Strategy E: First clean line
  if (!result.vendorName) {
    for (const line of lines) {
      if (!genericHeaders.test(line) && !isNoiseLine(line) && line.length > 3 && line.length < 50) {
        // Skip lines containing typical non-vendor keywords
        if (/(invoice|date|gstin|pan|phone|email|tel|fax|mob|address|street|city|state|pin|total|amount|rupees)/i.test(line)) continue;
        if (/^\+?\d{2,}[\s\-]?\d/.test(line)) continue;
        
        let cleanName = line.replace(/^[^a-zA-Z0-9]+/, '').trim();
        if (cleanName.length > 3) {
           result.vendorName = cleanName;
           break;
        }
      }
    }
  }

  return result;
}
