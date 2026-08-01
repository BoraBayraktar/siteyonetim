-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'DUE_ACCRUAL_MONTHLY';

-- AlterTable
ALTER TABLE "DueDefinition" ADD COLUMN "autoAccrualMonthly" BOOLEAN NOT NULL DEFAULT false;
