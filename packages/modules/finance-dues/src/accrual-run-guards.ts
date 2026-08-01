import { DueCalculationMode } from "@siteyonetim/db";

export function supportsSupplementAppend(calculationMode: DueCalculationMode): boolean {
  return (
    calculationMode === DueCalculationMode.FIXED ||
    calculationMode === DueCalculationMode.AREA_M2 ||
    calculationMode === DueCalculationMode.METER_CONSUMPTION
  );
}
