-- CreateEnum
CREATE TYPE "BankSyncProviderKind" AS ENUM ('WEBHOOK_PUSH', 'GENERIC_REST_POLL');

-- AlterEnum
ALTER TYPE "BankStatementImportSource" ADD VALUE 'API_REST_POLL';

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'BANK_STATEMENT_SYNC';

-- AlterTable
ALTER TABLE "PropertyBankWebhookProfile" ADD COLUMN "providerKind" "BankSyncProviderKind" NOT NULL DEFAULT 'WEBHOOK_PUSH';
ALTER TABLE "PropertyBankWebhookProfile" ADD COLUMN "pollUrl" TEXT;
ALTER TABLE "PropertyBankWebhookProfile" ADD COLUMN "restPollBearerToken" TEXT;
ALTER TABLE "PropertyBankWebhookProfile" ADD COLUMN "lastPollAt" TIMESTAMP(3);
