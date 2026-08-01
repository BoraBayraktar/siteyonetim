import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  BulkUpsertMetersInput,
  BulkUpsertMetersResult,
  BulkRecordReadingsInput,
  BulkRecordReadingsResult,
  ConsumptionQueryInput,
  DeleteReadingInput,
  ListMetersInput,
  ListReadingsForPropertyInput,
  MeterReadingDto,
  MeterServiceContract,
  RecordReadingInput,
  UnitConsumptionDto,
  UnitMeterDto,
  UpsertMeterInput,
} from "./contract";
import { MeterRepository } from "./repository";

export class MeterService implements MeterServiceContract {
  constructor(
    private readonly repository = new MeterRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async listMeters(input: ListMetersInput): Promise<UnitMeterDto[]> {
    return this.repository.listMeters(input);
  }

  async upsertMeter(input: UpsertMeterInput): Promise<UnitMeterDto> {
    const ok = await this.repository.unitInProperty(input.propertyId, input.unitId);
    if (!ok) throw new Error("UNIT_NOT_FOUND");
    const saved = await this.repository.upsertMeter(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "meter.upsert",
      entityType: "UnitMeter",
      entityId: saved.id,
      metadata: { unitId: input.unitId, kind: input.kind },
    });
    return saved;
  }

  async bulkUpsertMetersForKind(input: BulkUpsertMetersInput): Promise<BulkUpsertMetersResult> {
    const result = await this.repository.bulkUpsertMetersForKind(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "meter.bulkUpsert",
      entityType: "UnitMeter",
      entityId: input.propertyId,
      metadata: { kind: input.kind, ...result },
    });
    return result;
  }

  async recordReading(input: RecordReadingInput): Promise<MeterReadingDto> {
    const saved = await this.repository.recordReading(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "meter.reading.record",
      entityType: "MeterReading",
      entityId: saved.id,
      metadata: { year: input.year, month: input.month, value: input.readingValue },
    });
    return saved;
  }

  async bulkRecordReadings(input: BulkRecordReadingsInput): Promise<BulkRecordReadingsResult> {
    const result = await this.repository.bulkRecordReadings(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "meter.reading.bulkRecord",
      entityType: "MeterReading",
      entityId: input.propertyId,
      metadata: {
        kind: input.kind,
        year: input.year,
        month: input.month,
        ...result,
      },
    });
    return result;
  }

  async listReadings(meterId: string, organizationId: string, propertyId: string): Promise<MeterReadingDto[]> {
    return this.repository.listReadings(meterId, organizationId, propertyId);
  }

  async listReadingsForProperty(input: ListReadingsForPropertyInput): Promise<MeterReadingDto[]> {
    return this.repository.listReadingsForProperty(input.organizationId, input.propertyId);
  }

  async deleteReading(input: DeleteReadingInput): Promise<void> {
    await this.repository.deleteReading(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "meter.reading.delete",
      entityType: "MeterReading",
      entityId: input.readingId,
    });
  }

  async getMeterPeriodByUnit(input: ConsumptionQueryInput) {
    return this.repository.getMeterPeriodByUnit(input);
  }

  async getConsumptionByUnit(input: ConsumptionQueryInput): Promise<UnitConsumptionDto[]> {
    return this.repository.getConsumptionByUnit(input);
  }
}

export function createMeterService(): MeterService {
  return new MeterService();
}
