CREATE TYPE "SupplierLateFeeAllocationMode" AS ENUM (
  'ALL_UNITS_BY_SHARE',
  'ALL_UNITS_EQUAL',
  'DELINQUENT_BY_DEBT_RATIO',
  'DELINQUENT_EQUAL'
);

ALTER TYPE "DueCalculationMode" ADD VALUE 'SUPPLIER_LATE_FEE_BILL';
ALTER TYPE "DueAccrualLineKind" ADD VALUE 'SUPPLIER_LATE_FEE';

ALTER TABLE "DueDefinition"
  ADD COLUMN "supplierLateFeeAllocationMode" "SupplierLateFeeAllocationMode";

ALTER TABLE "DueAccrualRun"
  ADD COLUMN "supplierLateFeeAllocationMode" "SupplierLateFeeAllocationMode",
  ADD COLUMN "supplierReference" TEXT;
