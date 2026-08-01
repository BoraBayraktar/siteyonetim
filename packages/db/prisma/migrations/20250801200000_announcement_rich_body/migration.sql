-- CreateEnum
CREATE TYPE "AnnouncementBodyFormat" AS ENUM ('PLAIN', 'HTML');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "bodyFormat" "AnnouncementBodyFormat" NOT NULL DEFAULT 'PLAIN';
