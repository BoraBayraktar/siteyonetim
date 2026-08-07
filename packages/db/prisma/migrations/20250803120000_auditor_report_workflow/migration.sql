-- CreateEnum
CREATE TYPE "AuditorReportPeriod" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL');

-- CreateEnum
CREATE TYPE "AuditorReportStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditorDischargeRecommendation" AS ENUM ('RECOMMEND', 'NOT_RECOMMEND', 'CONDITIONAL');

-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'AUDITOR_REPORT';

-- CreateTable
CREATE TABLE "AuditorAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period" "AuditorReportPeriod" NOT NULL,
    "auditorUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "AuditorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditorReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period" "AuditorReportPeriod" NOT NULL,
    "status" "AuditorReportStatus" NOT NULL DEFAULT 'DRAFT',
    "opinionHtml" TEXT,
    "findingsHtml" TEXT,
    "dischargeRecommendation" "AuditorDischargeRecommendation",
    "finalizedPdfKey" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "AuditorReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditorAssignment_organizationId_propertyId_year_deleted_idx" ON "AuditorAssignment"("organizationId", "propertyId", "year", "deleted");

-- CreateIndex
CREATE INDEX "AuditorAssignment_auditorUserId_deleted_idx" ON "AuditorAssignment"("auditorUserId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "AuditorAssignment_active_unique" ON "AuditorAssignment"("propertyId", "year", "period", "auditorUserId") WHERE "deleted" = false;

-- CreateIndex
CREATE INDEX "AuditorReport_organizationId_propertyId_year_status_deleted_idx" ON "AuditorReport"("organizationId", "propertyId", "year", "status", "deleted");

-- CreateIndex
CREATE INDEX "AuditorReport_assignmentId_deleted_idx" ON "AuditorReport"("assignmentId", "deleted");

-- AddForeignKey
ALTER TABLE "AuditorAssignment" ADD CONSTRAINT "AuditorAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorReport" ADD CONSTRAINT "AuditorReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditorReport" ADD CONSTRAINT "AuditorReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AuditorAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
