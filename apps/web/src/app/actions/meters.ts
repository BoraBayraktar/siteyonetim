"use server";

import { MeterKind } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getMeterService } from "@/lib/services";

export type MeterActionState = {
  error?: string;
  success?: boolean;
  unitId?: string;
  kind?: MeterKind;
  meterId?: string;
};

export type BulkMeterActionState = {
  error?: string;
  success?: boolean;
  kind?: MeterKind;
  total?: number;
  created?: number;
  updated?: number;
};

export type BulkReadingActionState = {
  error?: string;
  success?: boolean;
  kind?: MeterKind;
  year?: number;
  month?: number;
  totalMeters?: number;
  saved?: number;
  skipped?: number;
};

function revalidateMeters(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/meters`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dues`, "page");
}

export async function upsertMeterAction(
  locale: string,
  propertyId: string,
  _prev: MeterActionState,
  formData: FormData,
): Promise<MeterActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getMeterService().upsertMeter({
      organizationId: session.user.organizationId,
      propertyId,
      unitId: String(formData.get("unitId") ?? ""),
      kind: String(formData.get("kind") ?? MeterKind.HOT_WATER) as MeterKind,
      serialNumber: String(formData.get("serialNumber") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateMeters(locale, propertyId);
    return {
      success: true,
      unitId: String(formData.get("unitId") ?? ""),
      kind: String(formData.get("kind") ?? MeterKind.HOT_WATER) as MeterKind,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_FOUND") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function bulkUpsertMetersAction(
  locale: string,
  propertyId: string,
  _prev: BulkMeterActionState,
  formData: FormData,
): Promise<BulkMeterActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    const kind = String(formData.get("kind") ?? MeterKind.HOT_WATER) as MeterKind;
    const result = await getMeterService().bulkUpsertMetersForKind({
      organizationId: session.user.organizationId,
      propertyId,
      kind,
      actorUserId: session.user.id,
    });
    if (result.total === 0) {
      return { error: "NO_UNITS" };
    }
    revalidateMeters(locale, propertyId);
    return {
      success: true,
      kind,
      total: result.total,
      created: result.created,
      updated: result.updated,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "NO_UNITS") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function recordMeterReadingAction(
  locale: string,
  propertyId: string,
  _prev: MeterActionState,
  formData: FormData,
): Promise<MeterActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getMeterService().recordReading({
      organizationId: session.user.organizationId,
      propertyId,
      meterId: String(formData.get("meterId") ?? ""),
      year: Number(formData.get("year")),
      month: Number(formData.get("month")),
      readingValue: String(formData.get("readingValue") ?? ""),
      actorUserId: session.user.id,
    });
    revalidateMeters(locale, propertyId);
    return {
      success: true,
      meterId: String(formData.get("meterId") ?? ""),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "METER_NOT_FOUND") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function bulkRecordMeterReadingsAction(
  locale: string,
  propertyId: string,
  _prev: BulkReadingActionState,
  formData: FormData,
): Promise<BulkReadingActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  const kind = String(formData.get("kind") ?? MeterKind.HOT_WATER) as MeterKind;
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const readings: { meterId: string; readingValue: string }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("reading_")) {
      continue;
    }
    const meterId = key.slice("reading_".length);
    if (!meterId) {
      continue;
    }
    readings.push({ meterId, readingValue: String(value) });
  }

  try {
    const result = await getMeterService().bulkRecordReadings({
      organizationId: session.user.organizationId,
      propertyId,
      kind,
      year,
      month,
      readings,
      actorUserId: session.user.id,
    });
    revalidateMeters(locale, propertyId);
    return {
      success: true,
      kind,
      year,
      month,
      totalMeters: result.totalMeters,
      saved: result.saved,
      skipped: result.skipped,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "NO_METERS_FOR_KIND" ||
        error.message === "NO_READINGS" ||
        error.message === "INVALID_PERIOD" ||
        error.message === "INVALID_READING_VALUE"
      ) {
        return { error: error.message };
      }
    }
    throw error;
  }
}

export async function deleteMeterReadingAction(
  locale: string,
  propertyId: string,
  readingId: string,
  _prev: MeterActionState,
  _formData: FormData,
): Promise<MeterActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getMeterService().deleteReading({
      organizationId: session.user.organizationId,
      propertyId,
      readingId,
      actorUserId: session.user.id,
    });
    revalidateMeters(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "READING_NOT_FOUND") {
      return { error: error.message };
    }
    throw error;
  }
}
