import { extractInvoiceData } from './src/extractor';
const text = `1 d [] . . 1 ol i GreenMartTraders Invoice Na: GM-2026-204, By & oy > . S SO Date: 06-02-2026 4 /_'_'[1 l& | -98Wholesale Street, City, State - 110001 Plae of SUDD1v: Delhi- BV AR' |
Total 1267.00
Rounded Total 1267.00
GSTIN: 07BBBBB1111B1Z1
`;
console.log(extractInvoiceData(text));
