import { MeterKind, Prisma, prisma } from "@siteyonetim/db";

import type {
  BulkUpsertMetersInput,
  BulkUpsertMetersResult,
  BulkRecordReadingsInput,
  BulkRecordReadingsResult,
  ConsumptionQueryInput,
  ListMetersInput,
  MeterReadingDto,
  RecordReadingInput,
  UnitConsumptionDto,
  UnitMeterDto,
  UnitMeterPeriodDto,
  UpsertMeterInput,
} from "./contract";
import { sortMetersByUnitCode } from "./unit-sort";

const notDeleted = { deleted: false };

function prevPeriod(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export class MeterRepository {
  async listMeters(input: ListMetersInput): Promise<UnitMeterDto[]> {
    const rows = await prisma.unitMeter.findMany({
      where: {
        propertyId: input.propertyId,
        organizationId: input.organizationId,
        ...notDeleted,
      },
      include: { unit: { select: { code: true } } },
    });
    return sortMetersByUnitCode(
      rows.map((r) => ({
        id: r.id,
        unitId: r.unitId,
        unitCode: r.unit.code,
        kind: r.kind,
        serialNumber: r.serialNumber,
        active: r.active,
      })),
    );
  }

  async upsertMeter(input: UpsertMeterInput): Promise<UnitMeterDto> {
    const row = await prisma.unitMeter.upsert({
      where: { unitId_kind: { unitId: input.unitId, kind: input.kind } },
      create: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        kind: input.kind,
        serialNumber: input.serialNumber?.trim() || null,
      },
      update: {
        serialNumber: input.serialNumber?.trim() || null,
        active: true,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      include: { unit: { select: { code: true } } },
    });
    return {
      id: row.id,
      unitId: row.unitId,
      unitCode: row.unit.code,
      kind: row.kind,
      serialNumber: row.serialNumber,
      active: row.active,
    };
  }

  async bulkUpsertMetersForKind(input: BulkUpsertMetersInput): Promise<BulkUpsertMetersResult> {
    const units = await prisma.unit.findMany({
      where: {
        propertyId: input.propertyId,
        ...notDeleted,
      },
      select: { id: true },
    });

    if (units.length === 0) {
      return { total: 0, created: 0, updated: 0 };
    }

    const existing = await prisma.unitMeter.findMany({
      where: {
        propertyId: input.propertyId,
        organizationId: input.organizationId,
        kind: input.kind,
        unitId: { in: units.map((unit) => unit.id) },
      },
      select: { unitId: true },
    });
    const existingUnitIds = new Set(existing.map((row) => row.unitId));

    await prisma.$transaction(
      units.map((unit) =>
        prisma.unitMeter.upsert({
          where: { unitId_kind: { unitId: unit.id, kind: input.kind } },
          create: {
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            unitId: unit.id,
            kind: input.kind,
            serialNumber: null,
          },
          update: {
            active: true,
            deleted: false,
            deletedDate: null,
            deletedUserId: null,
          },
        }),
      ),
    );

    let updated = 0;
    for (const unit of units) {
      if (existingUnitIds.has(unit.id)) {
        updated += 1;
      }
    }

    return {
      total: units.length,
      created: units.length - updated,
      updated,
    };
  }

  async recordReading(input: RecordReadingInput): Promise<MeterReadingDto> {
    const meter = await prisma.unitMeter.findFirst({
      where: {
        id: input.meterId,
        propertyId: input.propertyId,
        organizationId: input.organizationId,
        ...notDeleted,
      },
    });
    if (!meter) throw new Error("METER_NOT_FOUND");

    const value = new Prisma.Decimal(input.readingValue.replace(",", "."));
    const row = await prisma.meterReading.upsert({
      where: { meterId_year_month: { meterId: input.meterId, year: input.year, month: input.month } },
      create: {
        meterId: input.meterId,
        year: input.year,
        month: input.month,
        readingValue: value,
      },
      update: { readingValue: value, readAt: new Date(), deleted: false, deletedDate: null, deletedUserId: null },
    });
    return this.mapReadingRow(row);
  }

  async bulkRecordReadings(input: BulkRecordReadingsInput): Promise<BulkRecordReadingsResult> {
    if (!Number.isInteger(input.year) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new Error("INVALID_PERIOD");
    }

    const meters = await prisma.unitMeter.findMany({
      where: {
        propertyId: input.propertyId,
        organizationId: input.organizationId,
        kind: input.kind,
        active: true,
        ...notDeleted,
      },
      select: { id: true },
    });

    if (meters.length === 0) {
      throw new Error("NO_METERS_FOR_KIND");
    }

    const meterIds = new Set(meters.map((meter) => meter.id));
    const toSave = input.readings
      .filter((item) => meterIds.has(item.meterId))
      .map((item) => ({
        meterId: item.meterId,
        readingValue: item.readingValue.trim().replace(",", "."),
      }))
      .filter((item) => item.readingValue.length > 0);

    if (toSave.length === 0) {
      throw new Error("NO_READINGS");
    }

    for (const item of toSave) {
      const value = new Prisma.Decimal(item.readingValue);
      if (value.lt(0)) {
        throw new Error("INVALID_READING_VALUE");
      }
    }

    await prisma.$transaction(
      toSave.map((item) =>
        prisma.meterReading.upsert({
          where: {
            meterId_year_month: {
              meterId: item.meterId,
              year: input.year,
              month: input.month,
            },
          },
          create: {
            meterId: item.meterId,
            year: input.year,
            month: input.month,
            readingValue: new Prisma.Decimal(item.readingValue),
          },
          update: {
            readingValue: new Prisma.Decimal(item.readingValue),
            readAt: new Date(),
            deleted: false,
            deletedDate: null,
            deletedUserId: null,
          },
        }),
      ),
    );

    return {
      totalMeters: meters.length,
      saved: toSave.length,
      skipped: meters.length - toSave.length,
    };
  }

  private mapReadingRow(r: {
    id: string;
    meterId: string;
    year: number;
    month: number;
    readingValue: Prisma.Decimal;
    readAt: Date;
  }): MeterReadingDto {
    return {
      id: r.id,
      meterId: r.meterId,
      year: r.year,
      month: r.month,
      readingValue: r.readingValue.toString(),
      readAt: r.readAt,
    };
  }

  async listReadings(meterId: string, organizationId: string, propertyId: string) {
    const meter = await prisma.unitMeter.findFirst({
      where: { id: meterId, organizationId, propertyId, ...notDeleted },
    });
    if (!meter) return [];
    const rows = await prisma.meterReading.findMany({
      where: { meterId, ...notDeleted },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 24,
    });
    return rows.map((r) => this.mapReadingRow(r));
  }

  async listReadingsForProperty(organizationId: string, propertyId: string) {
    const rows = await prisma.meterReading.findMany({
      where: {
        ...notDeleted,
        meter: {
          organizationId,
          propertyId,
          ...notDeleted,
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return rows.map((r) => this.mapReadingRow(r));
  }

  async deleteReading(input: {
    readingId: string;
    organizationId: string;
    propertyId: string;
    actorUserId?: string | null;
  }) {
    const reading = await prisma.meterReading.findFirst({
      where: { id: input.readingId, ...notDeleted },
      include: { meter: true },
    });
    if (
      !reading ||
      reading.meter.organizationId !== input.organizationId ||
      reading.meter.propertyId !== input.propertyId ||
      reading.meter.deleted
    ) {
      throw new Error("READING_NOT_FOUND");
    }

    await prisma.meterReading.update({
      where: { id: input.readingId },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.actorUserId ?? null,
      },
    });
  }

  async getMeterPeriodByUnit(input: ConsumptionQueryInput): Promise<UnitMeterPeriodDto[]> {
    const meters = await prisma.unitMeter.findMany({
      where: {
        propertyId: input.propertyId,
        organizationId: input.organizationId,
        kind: input.kind,
        active: true,
        ...notDeleted,
      },
    });
    if (meters.length === 0) return [];

    const prev = prevPeriod(input.year, input.month);
    const meterIds = meters.map((m) => m.id);
    const readings = await prisma.meterReading.findMany({
      where: {
        meterId: { in: meterIds },
        ...notDeleted,
        OR: [
          { year: input.year, month: input.month },
          { year: prev.year, month: prev.month },
        ],
      },
    });

    const byMeter = new Map<string, Map<string, Prisma.Decimal>>();
    for (const r of readings) {
      const key = `${r.year}-${r.month}`;
      if (!byMeter.has(r.meterId)) byMeter.set(r.meterId, new Map());
      byMeter.get(r.meterId)!.set(key, r.readingValue);
    }

    const out: UnitMeterPeriodDto[] = [];
    for (const meter of meters) {
      const map = byMeter.get(meter.id);
      const cur = map?.get(`${input.year}-${input.month}`);
      const previous = map?.get(`${prev.year}-${prev.month}`);
      let consumption: string | null = null;
      if (cur && previous) {
        const delta = cur.sub(previous);
        if (delta.gte(0)) {
          consumption = delta.toString();
        }
      }
      out.push({
        unitId: meter.unitId,
        meterId: meter.id,
        currentIndex: cur?.toString() ?? null,
        previousIndex: previous?.toString() ?? null,
        consumption,
      });
    }
    return out;
  }

  async getConsumptionByUnit(input: ConsumptionQueryInput): Promise<UnitConsumptionDto[]> {
    const periods = await this.getMeterPeriodByUnit(input);
    return periods
      .filter((row) => row.consumption != null)
      .map((row) => ({
        unitId: row.unitId,
        meterId: row.meterId,
        consumption: row.consumption!,
      }));
  }

  async unitInProperty(propertyId: string, unitId: string) {
    const count = await prisma.unit.count({ where: { id: unitId, propertyId, ...notDeleted } });
    return count > 0;
  }
}
