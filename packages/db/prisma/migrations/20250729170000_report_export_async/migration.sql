CREATE TYPE "ReportExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
ALTER TYPE "JobType" ADD VALUE 'REPORT_EXPORT';

CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reportKind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "blockId" TEXT,
    "status" "ReportExportStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "errorMessage" TEXT,
    "requestedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportExport_organizationId_propertyId_status_createdAt_idx" ON "ReportExport"("organizationId", "propertyId", "status", "createdAt");

ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
