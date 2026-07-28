-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "OccupancyRole" AS ENUM ('OWNER', 'TENANT');

-- CreateIndex
CREATE UNIQUE INDEX "Block_propertyId_name_key" ON "Block"("propertyId", "name");

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "PartyType" NOT NULL DEFAULT 'PERSON',
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "portalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occupancy" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "OccupancyRole" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "Occupancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_portalUserId_key" ON "Party"("portalUserId");

-- CreateIndex
CREATE INDEX "Party_organizationId_deleted_idx" ON "Party"("organizationId", "deleted");

-- CreateIndex
CREATE INDEX "Party_email_idx" ON "Party"("email");

-- CreateIndex
CREATE INDEX "Occupancy_unitId_deleted_idx" ON "Occupancy"("unitId", "deleted");

-- CreateIndex
CREATE INDEX "Occupancy_partyId_deleted_idx" ON "Occupancy"("partyId", "deleted");

-- CreateIndex
CREATE INDEX "Occupancy_unitId_role_endDate_idx" ON "Occupancy"("unitId", "role", "endDate");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occupancy" ADD CONSTRAINT "Occupancy_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occupancy" ADD CONSTRAINT "Occupancy_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
