-- CreateTable
CREATE TABLE "RawTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importBatchId" TEXT NOT NULL,
    "originalLine" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "accountingStatus" TEXT NOT NULL,
    "category" TEXT,
    "currency" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
