-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultGoalId" TEXT;

-- AlterTable
ALTER TABLE "SavingsGoal" ADD COLUMN     "assetId" TEXT;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_defaultGoalId_fkey" FOREIGN KEY ("defaultGoalId") REFERENCES "SavingsGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
