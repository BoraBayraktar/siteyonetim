-- Announcement draft workflow for site staff

CREATE TYPE "AnnouncementWorkflowStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "Announcement"
ADD COLUMN "workflowStatus" "AnnouncementWorkflowStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "createdByUserId" TEXT;

UPDATE "Announcement" SET "workflowStatus" = 'PUBLISHED' WHERE "workflowStatus" IS NULL;

CREATE INDEX "Announcement_organizationId_propertyId_deleted_workflowStatus_idx"
ON "Announcement"("organizationId", "propertyId", "deleted", "workflowStatus");

ALTER TABLE "Announcement"
ADD CONSTRAINT "Announcement_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
