-- CreateEnum
CREATE TYPE "GeneralAssemblyMeetingType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');

-- CreateEnum
CREATE TYPE "AssemblyAttendanceMode" AS ENUM ('IN_PERSON', 'PROXY', 'ABSENT');

-- CreateEnum
CREATE TYPE "AssemblyDecisionOutcome" AS ENUM ('APPROVED', 'REJECTED', 'POSTPONED', 'NOT_VOTED');

-- CreateTable
CREATE TABLE "GeneralAssemblyMeeting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "meetingType" "GeneralAssemblyMeetingType" NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "agendaSummary" TEXT,
    "noticeSentAt" TIMESTAMP(3),
    "noticeMethod" TEXT,
    "linkedReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "GeneralAssemblyMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyDecision" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "outcome" "AssemblyDecisionOutcome" NOT NULL DEFAULT 'NOT_VOTED',
    "voteFor" INTEGER,
    "voteAgainst" INTEGER,
    "voteAbstain" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "AssemblyDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "mode" "AssemblyAttendanceMode" NOT NULL DEFAULT 'ABSENT',
    "proxyHolder" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "AssemblyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneralAssemblyMeeting_linkedReportId_key" ON "GeneralAssemblyMeeting"("linkedReportId");

-- CreateIndex
CREATE INDEX "GeneralAssemblyMeeting_propertyId_meetingDate_deleted_idx" ON "GeneralAssemblyMeeting"("propertyId", "meetingDate", "deleted");

-- CreateIndex
CREATE INDEX "GeneralAssemblyMeeting_organizationId_deleted_idx" ON "GeneralAssemblyMeeting"("organizationId", "deleted");

-- CreateIndex
CREATE INDEX "AssemblyDecision_meetingId_sortOrder_deleted_idx" ON "AssemblyDecision"("meetingId", "sortOrder", "deleted");

-- CreateIndex
CREATE INDEX "AssemblyAttendance_meetingId_deleted_idx" ON "AssemblyAttendance"("meetingId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyAttendance_meetingId_unitId_key" ON "AssemblyAttendance"("meetingId", "unitId");

-- AddForeignKey
ALTER TABLE "GeneralAssemblyMeeting" ADD CONSTRAINT "GeneralAssemblyMeeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralAssemblyMeeting" ADD CONSTRAINT "GeneralAssemblyMeeting_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralAssemblyMeeting" ADD CONSTRAINT "GeneralAssemblyMeeting_linkedReportId_fkey" FOREIGN KEY ("linkedReportId") REFERENCES "AuditorReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyDecision" ADD CONSTRAINT "AssemblyDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GeneralAssemblyMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyAttendance" ADD CONSTRAINT "AssemblyAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GeneralAssemblyMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyAttendance" ADD CONSTRAINT "AssemblyAttendance_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
