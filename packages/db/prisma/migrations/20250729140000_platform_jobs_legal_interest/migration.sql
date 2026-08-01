-- CreateEnum
CREATE TYPE "LateFeeRateKind" AS ENUM ('CONTRACTUAL', 'LEGAL_TCMB');
CREATE TYPE "JobType" AS ENUM ('LATE_FEE_MONTHLY');
CREATE TYPE "JobRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "DueLateFeePolicy" ADD COLUMN "rateKind" "LateFeeRateKind" NOT NULL DEFAULT 'CONTRACTUAL';

-- CreateTable
CREATE TABLE "LegalInterestRate" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "annualRatePercent" DECIMAL(8,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "LegalInterestRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "organizationId" TEXT,
    "propertyId" TEXT,
    "year" INTEGER,
    "month" INTEGER,
    "status" "JobRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalInterestRate_year_month_key" ON "LegalInterestRate"("year", "month");
CREATE INDEX "LegalInterestRate_deleted_idx" ON "LegalInterestRate"("deleted");

CREATE UNIQUE INDEX "JobRun_idempotencyKey_key" ON "JobRun"("idempotencyKey");
CREATE INDEX "JobRun_jobType_status_createdAt_idx" ON "JobRun"("jobType", "status", "createdAt");
CREATE INDEX "JobRun_organizationId_propertyId_idx" ON "JobRun"("organizationId", "propertyId");
