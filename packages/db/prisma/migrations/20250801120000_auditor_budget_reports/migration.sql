-- AlterEnum
ALTER TYPE "OrganizationRole" ADD VALUE 'AUDITOR';

-- AlterEnum
ALTER TYPE "ReportExportFormat" ADD VALUE 'ZIP';

-- CreateTable
CREATE TABLE "OperatingBudget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "OperatingBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingBudgetLine" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "plannedAmount" DECIMAL(14,2) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "OperatingBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatingBudget_propertyId_year_key" ON "OperatingBudget"("propertyId", "year");

-- CreateIndex
CREATE INDEX "OperatingBudget_organizationId_propertyId_deleted_idx" ON "OperatingBudget"("organizationId", "propertyId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingBudgetLine_budgetId_categoryId_key" ON "OperatingBudgetLine"("budgetId", "categoryId");

-- CreateIndex
CREATE INDEX "OperatingBudgetLine_budgetId_deleted_idx" ON "OperatingBudgetLine"("budgetId", "deleted");

-- AddForeignKey
ALTER TABLE "OperatingBudget" ADD CONSTRAINT "OperatingBudget_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingBudgetLine" ADD CONSTRAINT "OperatingBudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "OperatingBudget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingBudgetLine" ADD CONSTRAINT "OperatingBudgetLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
