const text = `1 d [] . . 1 ol i GreenMartTraders Invoice Na: GM-2026-204`;
const singleLine = text;
const invoiceNumPatterns = [
    /(?:invoice\s*(?:no\.?|na\.?|n[o0]\.?|number|#|num))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:bill\s*(?:no\.?|na\.?|number|#))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:invoice\s*#)\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:inv\.?\s*(?:no\.?|na\.?|#))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /invoice\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{3,})/i, // wait, did I make colon optional in fallback?
];

for (const regex of invoiceNumPatterns) {
    const match = singleLine.match(regex);
    if (match && match[1]) {
        console.log("Matched regex:", regex);
        console.log("Value:", match[1]);
        break;
    }
}
