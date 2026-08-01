-- CreateEnum
CREATE TYPE "ReportExportFormat" AS ENUM ('CSV', 'XLSX', 'PDF');

-- AlterTable
ALTER TABLE "ReportExport" ADD COLUMN "format" "ReportExportFormat" NOT NULL DEFAULT 'CSV';
