-- CreateEnum
CREATE TYPE "AdminUiMode" AS ENUM ('STANDARD', 'SIMPLE');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "adminUiMode" "AdminUiMode" NOT NULL DEFAULT 'STANDARD';
