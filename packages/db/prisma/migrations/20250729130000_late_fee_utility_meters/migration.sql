-- CreateEnum
CREATE TYPE "DueAccrualLineKind" AS ENUM ('STANDARD', 'LATE_FEE');

-- AlterEnum
ALTER TYPE "DueCalculationMode" ADD VALUE 'SHARE_RATIO';
ALTER TYPE "DueCalculationMode" ADD VALUE 'ALLOCATED_BILL';
ALTER TYPE "DueCalculationMode" ADD VALUE 'METER_CONSUMPTION';

-- CreateEnum
CREATE TYPE "MeterKind" AS ENUM ('HOT_WATER', 'COLD_WATER', 'HEATING', 'GAS');

-- CreateEnum
CREATE TYPE "HeatingSystemType" AS ENUM ('NONE', 'INDIVIDUAL_GAS', 'CENTRAL_GAS', 'CENTRAL_OTHER', 'DISTRICT_HEATING');

-- CreateEnum
CREATE TYPE "HotWaterSystemType" AS ENUM ('NONE', 'INDIVIDUAL', 'CENTRAL_INDIVIDUAL_METER', 'CENTRAL_SHARED');

-- AlterTable DueDefinition
ALTER TABLE "DueDefinition" ADD COLUMN "meterKind" "MeterKind",
ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable DueAccrualLine
ALTER TABLE "DueAccrualLine" ADD COLUMN "lineKind" "DueAccrualLineKind" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "sourceLineId" TEXT;

-- DropIndex
DROP INDEX "DueAccrualLine_accrualRunId_unitId_key";

-- CreateIndex
CREATE UNIQUE INDEX "DueAccrualLine_accrualRunId_unitId_lineKind_sourceLineId_key" ON "DueAccrualLine"("accrualRunId", "unitId", "lineKind", "sourceLineId");

-- AddForeignKey
ALTER TABLE "DueAccrualLine" ADD CONSTRAINT "DueAccrualLine_sourceLineId_fkey" FOREIGN KEY ("sourceLineId") REFERENCES "DueAccrualLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable PropertyUtilityProfile
CREATE TABLE "PropertyUtilityProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "heatingSystem" "HeatingSystemType" NOT NULL DEFAULT 'NONE',
    "hotWaterSystem" "HotWaterSystemType" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,
    CONSTRAINT "PropertyUtilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable DueLateFeePolicy
CREATE TABLE "DueLateFeePolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "monthlyRatePercent" DECIMAL(8,4) NOT NULL,
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "dueDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "lateFeeDefinitionId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,
    CONSTRAINT "DueLateFeePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable UnitMeter
CREATE TABLE "UnitMeter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" "MeterKind" NOT NULL,
    "serialNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,
    CONSTRAINT "UnitMeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable MeterReading
CREATE TABLE "MeterReading" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "readingValue" DECIMAL(14,4) NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,
    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyUtilityProfile_propertyId_key" ON "PropertyUtilityProfile"("propertyId");
CREATE INDEX "PropertyUtilityProfile_organizationId_deleted_idx" ON "PropertyUtilityProfile"("organizationId", "deleted");

CREATE UNIQUE INDEX "DueLateFeePolicy_propertyId_key" ON "DueLateFeePolicy"("propertyId");
CREATE INDEX "DueLateFeePolicy_organizationId_deleted_idx" ON "DueLateFeePolicy"("organizationId", "deleted");

CREATE UNIQUE INDEX "UnitMeter_unitId_kind_key" ON "UnitMeter"("unitId", "kind");
CREATE INDEX "UnitMeter_propertyId_deleted_idx" ON "UnitMeter"("propertyId", "deleted");

CREATE UNIQUE INDEX "MeterReading_meterId_year_month_key" ON "MeterReading"("meterId", "year", "month");
CREATE INDEX "MeterReading_meterId_year_month_idx" ON "MeterReading"("meterId", "year", "month");

-- AddForeignKey
ALTER TABLE "PropertyUtilityProfile" ADD CONSTRAINT "PropertyUtilityProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DueLateFeePolicy" ADD CONSTRAINT "DueLateFeePolicy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DueLateFeePolicy" ADD CONSTRAINT "DueLateFeePolicy_lateFeeDefinitionId_fkey" FOREIGN KEY ("lateFeeDefinitionId") REFERENCES "DueDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnitMeter" ADD CONSTRAINT "UnitMeter_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitMeter" ADD CONSTRAINT "UnitMeter_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "UnitMeter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
