-- CreateTable
CREATE TABLE "PropertyReportLetterheadProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "subtitleLine" TEXT,
    "legalNoticeTr" TEXT,
    "legalNoticeEn" TEXT,
    "documentRefPrefixTr" TEXT,
    "documentRefPrefixEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "PropertyReportLetterheadProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyReportLetterheadProfile_propertyId_key" ON "PropertyReportLetterheadProfile"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyReportLetterheadProfile_organizationId_deleted_idx" ON "PropertyReportLetterheadProfile"("organizationId", "deleted");

-- AddForeignKey
ALTER TABLE "PropertyReportLetterheadProfile" ADD CONSTRAINT "PropertyReportLetterheadProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
