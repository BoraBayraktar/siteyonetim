-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "publishStartAt" TIMESTAMP(3);
ALTER TABLE "Announcement" ADD COLUMN "publishEndAt" TIMESTAMP(3);

UPDATE "Announcement"
SET
  "publishStartAt" = "publishedAt",
  "publishEndAt" = TIMESTAMP '2099-12-31 23:59:59.999'
WHERE "publishStartAt" IS NULL;

ALTER TABLE "Announcement" ALTER COLUMN "publishStartAt" SET NOT NULL;
ALTER TABLE "Announcement" ALTER COLUMN "publishEndAt" SET NOT NULL;

CREATE INDEX "Announcement_organizationId_propertyId_deleted_publishStartAt_publishEndAt_idx"
ON "Announcement"("organizationId", "propertyId", "deleted", "publishStartAt", "publishEndAt");
