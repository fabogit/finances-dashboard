-- CreateTable
CREATE TABLE "EnrichedTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "originalLine" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "operation" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT
);

-- CreateIndex
CREATE INDEX "EnrichedTransaction_importBatchId_idx" ON "EnrichedTransaction"("importBatchId");

-- CreateIndex
CREATE INDEX "EnrichedTransaction_date_idx" ON "EnrichedTransaction"("date");

-- CreateIndex
CREATE INDEX "EnrichedTransaction_category_idx" ON "EnrichedTransaction"("category");

-- CreateIndex
CREATE INDEX "EnrichedTransaction_subCategory_idx" ON "EnrichedTransaction"("subCategory");
