const text = `1 d [] . . 1 ol i GreenMartTraders Invoice Na: GM-2026-204, By & oy > . S SO Date: 06-02-2026 4 /_'_'[1 l& | -98Wholesale Street, City, State - 110001 Plae of SUDD1v: Delhi- BV AR' |
Total 1267.00
Rounded Total 1267.00
GSTIN: 07BBBBB1111B1Z1
`;
const singleLine = text.replace(/\n/g, ' ');

const invoiceNumPatterns = [
    /(?:invoice\s*(?:no\.?|na\.?|n[o0]\.?|number|#|num))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:bill\s*(?:no\.?|na\.?|number|#))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:invoice\s*#)\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /(?:inv\.?\s*(?:no\.?|na\.?|#))\s*[:.;\-]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,})/i,
    /invoice\s*[:.;\-]\s*([A-Z0-9][A-Z0-9\-\/_.]{3,})/i,
];

for (const regex of invoiceNumPatterns) {
    const match = singleLine.match(regex);
    if (match && match[1]) {
        const val = match[1].trim();
        if (!/^(invoice|date|no|na|number|tax|the|details)$/i.test(val)) {
            console.log("Matched regex:", regex);
            console.log("Value:", val);
            break;
        }
    }
}
