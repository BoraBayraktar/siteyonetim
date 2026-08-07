-- Per-property staff operations capability profile

CREATE TABLE "PropertyStaffOpsProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "allowAnnouncementDraft" BOOLEAN NOT NULL DEFAULT true,
    "allowDocumentUpload" BOOLEAN NOT NULL DEFAULT true,
    "allowIncidents" BOOLEAN NOT NULL DEFAULT true,
    "staffCanViewPartyPhone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyStaffOpsProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyStaffOpsProfile_propertyId_key" ON "PropertyStaffOpsProfile"("propertyId");
CREATE INDEX "PropertyStaffOpsProfile_organizationId_deleted_idx" ON "PropertyStaffOpsProfile"("organizationId", "deleted");

ALTER TABLE "PropertyStaffOpsProfile" ADD CONSTRAINT "PropertyStaffOpsProfile_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
