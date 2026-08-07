-- Property incident reports (FAZ 2 / staff operations)

CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');
CREATE TYPE "IncidentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "IncidentCategory" AS ENUM ('ELEVATOR', 'PLUMBING', 'ELECTRICAL', 'COMMON_AREA', 'SECURITY', 'OTHER');

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "IncidentPriority" NOT NULL DEFAULT 'NORMAL',
    "category" "IncidentCategory" NOT NULL DEFAULT 'OTHER',
    "unitId" TEXT,
    "reportedByUserId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Incident_organizationId_propertyId_deleted_status_createdAt_idx"
ON "Incident"("organizationId", "propertyId", "deleted", "status", "createdAt");

CREATE INDEX "Incident_unitId_idx" ON "Incident"("unitId");
CREATE INDEX "Incident_reportedByUserId_idx" ON "Incident"("reportedByUserId");

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedByUserId_fkey"
FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
