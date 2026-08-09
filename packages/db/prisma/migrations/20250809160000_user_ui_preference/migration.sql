-- CreateEnum
CREATE TYPE "AdminNavProfile" AS ENUM ('DAILY', 'FULL', 'READONLY');

-- CreateTable
CREATE TABLE "UserUiPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adminOnboardingCompletedAt" TIMESTAMP(3),
    "adminOnboardingStep" INTEGER,
    "navProfile" "AdminNavProfile",
    "dismissedHints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "UserUiPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserUiPreference_organizationId_deleted_idx" ON "UserUiPreference"("organizationId", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "UserUiPreference_userId_organizationId_key" ON "UserUiPreference"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "UserUiPreference" ADD CONSTRAINT "UserUiPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
