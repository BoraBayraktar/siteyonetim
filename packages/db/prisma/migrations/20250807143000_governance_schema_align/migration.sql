-- Legacy prod dump had an older governance schema (location/agendaSummary/subject/mode).
-- Tables are empty locally; recreate to match current Prisma models.

DROP TABLE IF EXISTS "AssemblyAttendance" CASCADE;
DROP TABLE IF EXISTS "AssemblyDecision" CASCADE;
DROP TABLE IF EXISTS "GeneralAssemblyMeeting" CASCADE;

DROP TYPE IF EXISTS "AssemblyAttendanceMode";
DROP TYPE IF EXISTS "AssemblyDecisionOutcome";
DROP TYPE IF EXISTS "AssemblyAttendanceKind";
DROP TYPE IF EXISTS "AssemblyNoticeMethod";
DROP TYPE IF EXISTS "GeneralAssemblyMeetingType";

CREATE TYPE "GeneralAssemblyMeetingType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');
CREATE TYPE "AssemblyNoticeMethod" AS ENUM ('POST', 'COURIER', 'EMAIL', 'HAND_DELIVERY', 'OTHER');
CREATE TYPE "AssemblyAttendanceKind" AS ENUM ('PRESENT', 'PROXY', 'ABSENT');

CREATE TABLE "GeneralAssemblyMeeting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "meetingType" "GeneralAssemblyMeetingType" NOT NULL,
    "title" TEXT,
    "linkedReportId" TEXT,
    "noticeSentAt" TIMESTAMP(3),
    "noticeMethod" "AssemblyNoticeMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "GeneralAssemblyMeeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssemblyDecision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "AssemblyDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssemblyAttendance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "attendanceKind" "AssemblyAttendanceKind" NOT NULL,
    "proxyHolderName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "AssemblyAttendance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeneralAssemblyMeeting_organizationId_propertyId_meetingDate_idx" ON "GeneralAssemblyMeeting"("organizationId", "propertyId", "meetingDate", "deleted");
CREATE INDEX "GeneralAssemblyMeeting_linkedReportId_deleted_idx" ON "GeneralAssemblyMeeting"("linkedReportId", "deleted");
CREATE INDEX "AssemblyDecision_meetingId_deleted_idx" ON "AssemblyDecision"("meetingId", "deleted");
CREATE INDEX "AssemblyDecision_organizationId_propertyId_deleted_idx" ON "AssemblyDecision"("organizationId", "propertyId", "deleted");
CREATE UNIQUE INDEX "AssemblyAttendance_meetingId_unitId_key" ON "AssemblyAttendance"("meetingId", "unitId");
CREATE INDEX "AssemblyAttendance_organizationId_propertyId_deleted_idx" ON "AssemblyAttendance"("organizationId", "propertyId", "deleted");

ALTER TABLE "GeneralAssemblyMeeting" ADD CONSTRAINT "GeneralAssemblyMeeting_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneralAssemblyMeeting" ADD CONSTRAINT "GeneralAssemblyMeeting_linkedReportId_fkey" FOREIGN KEY ("linkedReportId") REFERENCES "AuditorReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssemblyDecision" ADD CONSTRAINT "AssemblyDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GeneralAssemblyMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssemblyAttendance" ADD CONSTRAINT "AssemblyAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GeneralAssemblyMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssemblyAttendance" ADD CONSTRAINT "AssemblyAttendance_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
