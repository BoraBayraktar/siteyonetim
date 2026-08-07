-- Portal incident reporting: portal settings toggle + optional credential reporter on incidents

ALTER TABLE "PropertyPortalSettings" ADD COLUMN "showIncidents" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Incident" ADD COLUMN "reportedByCredentialId" TEXT;
ALTER TABLE "Incident" ADD COLUMN "reporterDisplayName" TEXT;

UPDATE "Incident" AS i
SET "reporterDisplayName" = u.name
FROM "User" AS u
WHERE i."reportedByUserId" = u.id AND i."reporterDisplayName" IS NULL;

UPDATE "Incident"
SET "reporterDisplayName" = 'Unknown'
WHERE "reporterDisplayName" IS NULL;

ALTER TABLE "Incident" ALTER COLUMN "reporterDisplayName" SET NOT NULL;
ALTER TABLE "Incident" ALTER COLUMN "reportedByUserId" DROP NOT NULL;

CREATE INDEX "Incident_reportedByCredentialId_idx" ON "Incident"("reportedByCredentialId");

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedByCredentialId_fkey"
  FOREIGN KEY ("reportedByCredentialId") REFERENCES "PortalUnitCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
