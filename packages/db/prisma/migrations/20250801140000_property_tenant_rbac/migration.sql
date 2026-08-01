-- CreateEnum
CREATE TYPE "PropertyIsolationMode" AS ENUM ('SHARED_SCHEMA', 'DEDICATED_DATABASE');

-- CreateEnum
CREATE TYPE "PropertyTenantStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "PortalAuthMode" AS ENUM ('EMAIL', 'UNIT_CREDENTIAL', 'BOTH');

-- CreateEnum
CREATE TYPE "PropertyAccessRole" AS ENUM (
  'PROPERTY_ADMIN',
  'PROPERTY_MANAGER',
  'PROPERTY_ACCOUNTANT',
  'PROPERTY_AUDITOR',
  'PROPERTY_BOARD_MEMBER',
  'PROPERTY_STAFF',
  'SECURITY',
  'MAINTENANCE'
);

-- CreateTable
CREATE TABLE "PropertyTenant" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "portalCode" TEXT NOT NULL,
    "isolationMode" "PropertyIsolationMode" NOT NULL DEFAULT 'SHARED_SCHEMA',
    "neonProjectId" TEXT,
    "neonBranchId" TEXT,
    "databaseUrlSecretKey" TEXT,
    "portalAuthMode" "PortalAuthMode" NOT NULL DEFAULT 'BOTH',
    "status" "PropertyTenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPortalSettings" (
    "id" TEXT NOT NULL,
    "propertyTenantId" TEXT NOT NULL,
    "showIncomeExpenseReport" BOOLEAN NOT NULL DEFAULT false,
    "showMemberDebtSummary" BOOLEAN NOT NULL DEFAULT false,
    "allowOnlinePayment" BOOLEAN NOT NULL DEFAULT false,
    "showAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "showDocuments" BOOLEAN NOT NULL DEFAULT true,
    "showStatement" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyPortalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPropertyAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "role" "PropertyAccessRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "UserPropertyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUnitCredential" (
    "id" TEXT NOT NULL,
    "propertyTenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PortalUnitCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTenant_propertyId_key" ON "PropertyTenant"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTenant_portalCode_key" ON "PropertyTenant"("portalCode");

-- CreateIndex
CREATE INDEX "PropertyTenant_organizationId_deleted_idx" ON "PropertyTenant"("organizationId", "deleted");

-- CreateIndex
CREATE INDEX "PropertyTenant_portalCode_deleted_idx" ON "PropertyTenant"("portalCode", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPortalSettings_propertyTenantId_key" ON "PropertyPortalSettings"("propertyTenantId");

-- CreateIndex
CREATE INDEX "UserPropertyAccess_organizationId_propertyId_deleted_idx" ON "UserPropertyAccess"("organizationId", "propertyId", "deleted");

-- CreateIndex
CREATE INDEX "UserPropertyAccess_userId_deleted_idx" ON "UserPropertyAccess"("userId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "UserPropertyAccess_userId_propertyId_key" ON "UserPropertyAccess"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUnitCredential_unitId_key" ON "PortalUnitCredential"("unitId");

-- CreateIndex
CREATE INDEX "PortalUnitCredential_propertyId_deleted_idx" ON "PortalUnitCredential"("propertyId", "deleted");

-- CreateIndex
CREATE INDEX "PortalUnitCredential_propertyTenantId_deleted_idx" ON "PortalUnitCredential"("propertyTenantId", "deleted");

-- AddForeignKey
ALTER TABLE "PropertyTenant" ADD CONSTRAINT "PropertyTenant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPortalSettings" ADD CONSTRAINT "PropertyPortalSettings_propertyTenantId_fkey" FOREIGN KEY ("propertyTenantId") REFERENCES "PropertyTenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPropertyAccess" ADD CONSTRAINT "UserPropertyAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPropertyAccess" ADD CONSTRAINT "UserPropertyAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUnitCredential" ADD CONSTRAINT "PortalUnitCredential_propertyTenantId_fkey" FOREIGN KEY ("propertyTenantId") REFERENCES "PropertyTenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUnitCredential" ADD CONSTRAINT "PortalUnitCredential_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUnitCredential" ADD CONSTRAINT "PortalUnitCredential_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill PropertyTenant for existing properties
INSERT INTO "PropertyTenant" (
    "id",
    "propertyId",
    "organizationId",
    "portalCode",
    "isolationMode",
    "portalAuthMode",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    'pt_' || p."id",
    p."id",
    p."organizationId",
    UPPER(SUBSTRING(REPLACE(p."id", '-', ''), 1, 12)),
    'SHARED_SCHEMA',
    'BOTH',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Property" p
WHERE p."deleted" = false
ON CONFLICT DO NOTHING;

-- Backfill default portal settings
INSERT INTO "PropertyPortalSettings" (
    "id",
    "propertyTenantId",
    "createdAt",
    "updatedAt"
)
SELECT
    'pps_' || pt."id",
    pt."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "PropertyTenant" pt
WHERE pt."deleted" = false
ON CONFLICT DO NOTHING;
