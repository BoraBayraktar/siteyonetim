-- CreateEnum
CREATE TYPE "DueCalculationMode" AS ENUM ('FIXED', 'AREA_M2');

-- CreateEnum
CREATE TYPE "DueAccrualStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateEnum
CREATE TYPE "DueLineStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('MANUAL', 'ONLINE', 'BANK');

-- CreateTable
CREATE TABLE "DueDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calculationMode" "DueCalculationMode" NOT NULL DEFAULT 'FIXED',
    "fixedAmount" DECIMAL(14,2),
    "ratePerM2" DECIMAL(14,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "DueDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueAccrualRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "dueDefinitionId" TEXT NOT NULL,
    "financePeriodId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "DueAccrualStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "DueAccrualRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueAccrualLine" (
    "id" TEXT NOT NULL,
    "accrualRunId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "partyId" TEXT,
    "financeAccountId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "DueLineStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "DueAccrualLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "channel" "PaymentChannel" NOT NULL DEFAULT 'MANUAL',
    "amount" DECIMAL(14,2) NOT NULL,
    "cashboxId" TEXT NOT NULL,
    "financeAccountId" TEXT,
    "partyId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentNo" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "dueAccrualLineId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DueDefinition_propertyId_name_key" ON "DueDefinition"("propertyId", "name");

-- CreateIndex
CREATE INDEX "DueDefinition_propertyId_deleted_idx" ON "DueDefinition"("propertyId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "DueAccrualRun_propertyId_dueDefinitionId_year_month_key" ON "DueAccrualRun"("propertyId", "dueDefinitionId", "year", "month");

-- CreateIndex
CREATE INDEX "DueAccrualRun_propertyId_status_idx" ON "DueAccrualRun"("propertyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DueAccrualLine_accrualRunId_unitId_key" ON "DueAccrualLine"("accrualRunId", "unitId");

-- CreateIndex
CREATE INDEX "DueAccrualLine_unitId_status_idx" ON "DueAccrualLine"("unitId", "status");

-- CreateIndex
CREATE INDEX "DueAccrualLine_partyId_idx" ON "DueAccrualLine"("partyId");

-- CreateIndex
CREATE INDEX "Payment_propertyId_paymentDate_idx" ON "Payment"("propertyId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_partyId_idx" ON "Payment"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_dueAccrualLineId_key" ON "PaymentAllocation"("paymentId", "dueAccrualLineId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_dueAccrualLineId_idx" ON "PaymentAllocation"("dueAccrualLineId");

-- AddForeignKey
ALTER TABLE "DueDefinition" ADD CONSTRAINT "DueDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDefinition" ADD CONSTRAINT "DueDefinition_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualRun" ADD CONSTRAINT "DueAccrualRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualRun" ADD CONSTRAINT "DueAccrualRun_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualRun" ADD CONSTRAINT "DueAccrualRun_dueDefinitionId_fkey" FOREIGN KEY ("dueDefinitionId") REFERENCES "DueDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualRun" ADD CONSTRAINT "DueAccrualRun_financePeriodId_fkey" FOREIGN KEY ("financePeriodId") REFERENCES "FinancePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualLine" ADD CONSTRAINT "DueAccrualLine_accrualRunId_fkey" FOREIGN KEY ("accrualRunId") REFERENCES "DueAccrualRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualLine" ADD CONSTRAINT "DueAccrualLine_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualLine" ADD CONSTRAINT "DueAccrualLine_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueAccrualLine" ADD CONSTRAINT "DueAccrualLine_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES "Cashbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_dueAccrualLineId_fkey" FOREIGN KEY ("dueAccrualLineId") REFERENCES "DueAccrualLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
