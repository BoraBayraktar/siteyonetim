ALTER TYPE "OutboxChannel" ADD VALUE 'WHATSAPP';

CREATE TABLE "PropertyWhatsAppProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumberId" TEXT,
    "templateName" TEXT NOT NULL DEFAULT 'siteyonetim_duyuru',
    "templateLanguage" TEXT NOT NULL DEFAULT 'tr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyWhatsAppProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyWhatsAppProfile_propertyId_key" ON "PropertyWhatsAppProfile"("propertyId");
CREATE INDEX "PropertyWhatsAppProfile_organizationId_deleted_idx" ON "PropertyWhatsAppProfile"("organizationId", "deleted");

ALTER TABLE "PropertyWhatsAppProfile" ADD CONSTRAINT "PropertyWhatsAppProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
