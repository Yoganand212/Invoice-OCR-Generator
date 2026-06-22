-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "extractedText" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TEXT,
    "vendorName" TEXT,
    "gstNumber" TEXT,
    "totalAmount" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
