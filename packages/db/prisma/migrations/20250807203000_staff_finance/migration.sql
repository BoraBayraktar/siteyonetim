-- CreateEnum
CREATE TYPE "StaffEmploymentStatus" AS ENUM ('ACTIVE', 'PASSIVE');

-- CreateEnum
CREATE TYPE "StaffMovementType" AS ENUM ('SALARY_ACCRUAL', 'ADVANCE', 'PAYMENT', 'ADVANCE_OFFSET', 'DEDUCTION', 'BONUS', 'MANUAL_ADJUSTMENT');

-- AlterEnum
ALTER TYPE "FinanceAccountKind" ADD VALUE 'STAFF';

-- CreateTable
CREATE TABLE "PropertyStaffProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "financeAccountId" TEXT NOT NULL,
    "staffNo" TEXT,
    "title" TEXT,
    "department" TEXT,
    "employmentStartDate" TIMESTAMP(3),
    "employmentEndDate" TIMESTAMP(3),
    "status" "StaffEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyStaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAccountMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "financeAccountId" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "movementType" "StaffMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "documentNo" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "StaffAccountMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyStaffProfile_financeAccountId_key" ON "PropertyStaffProfile"("financeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyStaffProfile_propertyId_partyId_deleted_key" ON "PropertyStaffProfile"("propertyId", "partyId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyStaffProfile_propertyId_staffNo_key" ON "PropertyStaffProfile"("propertyId", "staffNo");

-- CreateIndex
CREATE INDEX "PropertyStaffProfile_organizationId_propertyId_status_deleted_idx" ON "PropertyStaffProfile"("organizationId", "propertyId", "status", "deleted");

-- CreateIndex
CREATE INDEX "PropertyStaffProfile_partyId_deleted_idx" ON "PropertyStaffProfile"("partyId", "deleted");

-- CreateIndex
CREATE INDEX "StaffAccountMovement_propertyId_movementDate_idx" ON "StaffAccountMovement"("propertyId", "movementDate");

-- CreateIndex
CREATE INDEX "StaffAccountMovement_staffProfileId_movementDate_idx" ON "StaffAccountMovement"("staffProfileId", "movementDate");

-- CreateIndex
CREATE INDEX "StaffAccountMovement_financeAccountId_idx" ON "StaffAccountMovement"("financeAccountId");

-- CreateIndex
CREATE INDEX "StaffAccountMovement_ledgerEntryId_idx" ON "StaffAccountMovement"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "StaffAccountMovement_organizationId_deleted_idx" ON "StaffAccountMovement"("organizationId", "deleted");

-- AddForeignKey
ALTER TABLE "PropertyStaffProfile" ADD CONSTRAINT "PropertyStaffProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyStaffProfile" ADD CONSTRAINT "PropertyStaffProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyStaffProfile" ADD CONSTRAINT "PropertyStaffProfile_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyStaffProfile" ADD CONSTRAINT "PropertyStaffProfile_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccountMovement" ADD CONSTRAINT "StaffAccountMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccountMovement" ADD CONSTRAINT "StaffAccountMovement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccountMovement" ADD CONSTRAINT "StaffAccountMovement_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "PropertyStaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccountMovement" ADD CONSTRAINT "StaffAccountMovement_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccountMovement" ADD CONSTRAINT "StaffAccountMovement_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
