import { SupplierLateFeeAllocationMode } from "@siteyonetim/db";

export const SUPPLIER_LATE_FEE_ALLOCATION_MODES: SupplierLateFeeAllocationMode[] = [
  SupplierLateFeeAllocationMode.ALL_UNITS_BY_SHARE,
  SupplierLateFeeAllocationMode.ALL_UNITS_EQUAL,
  SupplierLateFeeAllocationMode.DELINQUENT_BY_DEBT_RATIO,
  SupplierLateFeeAllocationMode.DELINQUENT_EQUAL,
];

export function isSupplierLateFeeDefinitionMode(mode: string): boolean {
  return mode === "SUPPLIER_LATE_FEE_BILL";
}

export function needsSupplierLateFeeBill(mode: string): boolean {
  return isSupplierLateFeeDefinitionMode(mode);
}

export function needsTotalBillAmount(mode: string): boolean {
  return (
    mode === "ALLOCATED_BILL" ||
    mode === "METER_ALLOCATED_BILL" ||
    mode === "SUPPLIER_LATE_FEE_BILL"
  );
}
