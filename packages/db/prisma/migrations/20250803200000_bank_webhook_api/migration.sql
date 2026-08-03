-- CreateEnum
CREATE TYPE "BankStatementImportSource" AS ENUM ('MANUAL_CSV', 'API_WEBHOOK');

-- AlterTable
ALTER TABLE "BankStatementImport" ADD COLUMN "source" "BankStatementImportSource" NOT NULL DEFAULT 'MANUAL_CSV';

-- CreateTable
CREATE TABLE "PropertyBankWebhookProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cashboxId" TEXT,
    "webhookSecretHash" TEXT,
    "lastReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyBankWebhookProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyBankWebhookProfile_propertyId_key" ON "PropertyBankWebhookProfile"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyBankWebhookProfile_organizationId_deleted_idx" ON "PropertyBankWebhookProfile"("organizationId", "deleted");

-- AddForeignKey
ALTER TABLE "PropertyBankWebhookProfile" ADD CONSTRAINT "PropertyBankWebhookProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyBankWebhookProfile" ADD CONSTRAINT "PropertyBankWebhookProfile_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES "Cashbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
