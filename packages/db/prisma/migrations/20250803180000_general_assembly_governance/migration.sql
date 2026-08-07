-- CreateEnum
CREATE TYPE "GeneralAssemblyMeetingType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');

-- CreateEnum
CREATE TYPE "AssemblyNoticeMethod" AS ENUM ('POST', 'COURIER', 'EMAIL', 'HAND_DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "AssemblyAttendanceKind" AS ENUM ('PRESENT', 'PROXY', 'ABSENT');

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX "GeneralAssemblyMeeting_organizationId_propertyId_meetingDate_idx" ON "GeneralAssemblyMeeting"("organizationId", "propertyId", "meetingDate", "deleted");

-- CreateIndex
CREATE INDEX "GeneralAssemblyMeeting_linkedReportId_deleted_idx" ON "GeneralAssemblyMeeting"("linkedReportId", "deleted");

-- CreateIndex
CREATE INDEX "AssemblyDecision_meetingId_deleted_idx" ON "AssemblyDecision"("meetingId", "deleted");

-- CreateIndex
CREATE INDEX "AssemblyDecision_organizationId_propertyId_deleted_idx" ON "AssemblyDecision"("organizationId", "propertyId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyAttendance_meetingId_unitId_key" ON "AssemblyAttendance"("meetingId", "unitId");

-- CreateIndex
CREATE INDEX "AssemblyAttendance_organizationId_propertyId_deleted_idx" ON "AssemblyAttendance"("organizationId", "propertyId", "deleted");

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
