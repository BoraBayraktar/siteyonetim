import { LateFeeRateKind } from "@siteyonetim/db";
import type { DueLateFeePolicyDto } from "@siteyonetim/finance-dues";

export type LateFeeUiMode = "NONE" | LateFeeRateKind;

export const LATE_FEE_UI_MODES: LateFeeUiMode[] = ["NONE", LateFeeRateKind.CONTRACTUAL, LateFeeRateKind.LEGAL_TCMB];

export const DEFAULT_CONTRACTUAL_RATE = "2";

export function resolveLateFeeUiMode(policy: DueLateFeePolicyDto | null): LateFeeUiMode {
  if (!policy?.active) return "NONE";
  return policy.rateKind;
}

export function isLateFeeEnabled(mode: LateFeeUiMode): boolean {
  return mode !== "NONE";
}
