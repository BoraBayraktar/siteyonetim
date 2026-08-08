-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('IYZICO');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "externalReference" TEXT,
ADD COLUMN "paymentIntentId" TEXT;

-- CreateTable
CREATE TABLE "PropertyPaymentProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'IYZICO',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT,
    "secretEnc" TEXT,
    "sandbox" BOOLEAN NOT NULL DEFAULT true,
    "defaultCashboxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyPaymentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "unitId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "conversationId" TEXT NOT NULL,
    "providerToken" TEXT,
    "providerPaymentId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "expiresAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPaymentProfile_propertyId_key" ON "PropertyPaymentProfile"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyPaymentProfile_organizationId_deleted_idx" ON "PropertyPaymentProfile"("organizationId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_conversationId_key" ON "PaymentIntent"("conversationId");

-- CreateIndex
CREATE INDEX "PaymentIntent_propertyId_status_deleted_idx" ON "PaymentIntent"("propertyId", "status", "deleted");

-- CreateIndex
CREATE INDEX "PaymentIntent_partyId_deleted_idx" ON "PaymentIntent"("partyId", "deleted");

-- CreateIndex
CREATE INDEX "PaymentIntent_providerToken_idx" ON "PaymentIntent"("providerToken");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentIntentId_key" ON "Payment"("paymentIntentId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPaymentProfile" ADD CONSTRAINT "PropertyPaymentProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPaymentProfile" ADD CONSTRAINT "PropertyPaymentProfile_defaultCashboxId_fkey" FOREIGN KEY ("defaultCashboxId") REFERENCES "Cashbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
