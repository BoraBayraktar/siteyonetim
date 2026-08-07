import type { UnitDto } from "@siteyonetim/property-core";
import type { MeterReadingDto, UnitMeterDto } from "@siteyonetim/property-meters";

import { getMeterService, getUnitService } from "@/lib/services";

type StaffMetersContext = {
  organizationId: string;
  propertyId: string;
  actorUserId: string;
};

export type StaffMetersPageData = {
  meters: UnitMeterDto[];
  meterUnits: UnitDto[];
  readingsByMeterId: Record<string, MeterReadingDto[]>;
};

function groupReadingsByMeterId(readings: MeterReadingDto[]): Record<string, MeterReadingDto[]> {
  const readingsByMeterId: Record<string, MeterReadingDto[]> = {};
  for (const reading of readings) {
    if (!readingsByMeterId[reading.meterId]) {
      readingsByMeterId[reading.meterId] = [];
    }
    readingsByMeterId[reading.meterId]!.push(reading);
  }
  return readingsByMeterId;
}

export async function loadStaffMetersData(ctx: StaffMetersContext): Promise<StaffMetersPageData> {
  const [meters, meterUnitsPage, meterReadings] = await Promise.all([
    getMeterService().listMeters(ctx),
    getUnitService().list({ ...ctx, page: 1, pageSize: 500 }),
    getMeterService().listReadingsForProperty(ctx),
  ]);

  return {
    meters,
    meterUnits: meterUnitsPage.items,
    readingsByMeterId: groupReadingsByMeterId(meterReadings),
  };
}
