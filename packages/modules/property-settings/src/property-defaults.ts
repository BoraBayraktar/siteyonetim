import { DueCalculationMode, PropertyKind } from "@siteyonetim/db";

export const DEFAULT_BLOCK_NAME = "A Blok";
export const DEFAULT_CASHBOX_NAME = "Ana kasa";

export function recommendCalculationMode(input: {
  blockCount: number;
  unitCount: number;
}): DueCalculationMode {
  if (input.unitCount <= 1 || input.blockCount <= 1) {
    return DueCalculationMode.FIXED;
  }
  return DueCalculationMode.FIXED;
}

export function shouldSuggestSimpleMode(kind: PropertyKind, adminUiMode: string): boolean {
  return kind === PropertyKind.APARTMAN && adminUiMode !== "SIMPLE";
}

export function shouldSuggestDefaultBlock(kind: PropertyKind, blockCount: number): boolean {
  return kind === PropertyKind.APARTMAN && blockCount === 0;
}

export function shouldSuggestDefaultCashbox(cashboxCount: number): boolean {
  return cashboxCount === 0;
}
