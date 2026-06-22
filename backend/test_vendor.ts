const text = `] '.I GreenMart Traders invoice No: GM-2026-204`;
const companyRegex = /\b([A-Z][A-Za-z0-9&.\s']{2,}(?:Pvt\.?\s*Ltd\.?|Private\s*Limited|Ltd\.?|Limited|LLC|Inc\.?|Corporation|Corp\.?|LLP|Co\.?\s*Ltd\.?|Enterprises|Industries|Services|Solutions|Technologies|Tech|Traders|Trading|Associates|Distributors|Exports|Imports|Agencies|Mart|Store|Stores|Shop|Emporium))\b/i;
const companyMatch = text.match(companyRegex);
console.log("Match:", companyMatch ? companyMatch[1] : null);
