import type { MeterKind } from "@siteyonetim/db";

export type UnitMeterDto = {
  id: string;
  unitId: string;
  unitCode: string;
  kind: MeterKind;
  serialNumber: string | null;
  active: boolean;
};

export type MeterReadingDto = {
  id: string;
  meterId: string;
  year: number;
  month: number;
  readingValue: string;
  readAt: Date;
};

export type UnitConsumptionDto = {
  unitId: string;
  meterId: string;
  consumption: string;
};

export type UnitMeterPeriodDto = {
  unitId: string;
  meterId: string;
  currentIndex: string | null;
  previousIndex: string | null;
  consumption: string | null;
};

export type MeterContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type UpsertMeterInput = MeterContext & {
  unitId: string;
  kind: MeterKind;
  serialNumber?: string | null;
};

export type BulkUpsertMetersInput = MeterContext & {
  kind: MeterKind;
};

export type BulkUpsertMetersResult = {
  total: number;
  created: number;
  updated: number;
};

export type RecordReadingInput = MeterContext & {
  meterId: string;
  year: number;
  month: number;
  readingValue: string;
};

export type DeleteReadingInput = MeterContext & {
  readingId: string;
};

export type BulkRecordReadingsInput = MeterContext & {
  kind: MeterKind;
  year: number;
  month: number;
  readings: BulkReadingItem[];
};

export type BulkRecordReadingsResult = {
  totalMeters: number;
  saved: number;
  skipped: number;
};

export type BulkReadingItem = {
  meterId: string;
  readingValue: string;
};

export type ListMetersInput = MeterContext;

export type ListReadingsForPropertyInput = MeterContext;

export type ConsumptionQueryInput = MeterContext & {
  kind: MeterKind;
  year: number;
  month: number;
};

export interface MeterServiceContract {
  listMeters(input: ListMetersInput): Promise<UnitMeterDto[]>;
  upsertMeter(input: UpsertMeterInput): Promise<UnitMeterDto>;
  bulkUpsertMetersForKind(input: BulkUpsertMetersInput): Promise<BulkUpsertMetersResult>;
  recordReading(input: RecordReadingInput): Promise<MeterReadingDto>;
  bulkRecordReadings(input: BulkRecordReadingsInput): Promise<BulkRecordReadingsResult>;
  deleteReading(input: DeleteReadingInput): Promise<void>;
  listReadings(meterId: string, organizationId: string, propertyId: string): Promise<MeterReadingDto[]>;
  listReadingsForProperty(input: ListReadingsForPropertyInput): Promise<MeterReadingDto[]>;
  getMeterPeriodByUnit(input: ConsumptionQueryInput): Promise<UnitMeterPeriodDto[]>;
  getConsumptionByUnit(input: ConsumptionQueryInput): Promise<UnitConsumptionDto[]>;
}
