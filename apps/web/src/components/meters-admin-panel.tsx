"use client";

import { MeterKind } from "@siteyonetim/db";
import type { MeterReadingDto, UnitMeterDto } from "@siteyonetim/property-meters";
import type { UnitDto } from "@siteyonetim/property-core";
import { sortUnitsByCode } from "@siteyonetim/property-core";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  bulkUpsertMetersAction,
  upsertMeterAction,
  type BulkMeterActionState,
  type MeterActionState,
} from "@/app/actions/meters";
import { FormDrawer } from "@/components/form-drawer";
import { BulkMeterReadingsDrawer } from "@/components/bulk-meter-readings-drawer";
import { MeterReadingsDrawer } from "@/components/meter-readings-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initial: MeterActionState = {};
const bulkInitial: BulkMeterActionState = {};

type MeterFormSelection = { unitId: string; kind: MeterKind };

const meterFormSelectionByProperty = new Map<string, MeterFormSelection>();

function resolveMeterFormSelection(propertyId: string, units: UnitDto[]): MeterFormSelection {
  const stored = meterFormSelectionByProperty.get(propertyId);
  if (stored && units.some((unit) => unit.id === stored.unitId)) {
    return stored;
  }
  return { unitId: units[0]?.id ?? "", kind: MeterKind.HOT_WATER };
}

function persistMeterFormSelection(propertyId: string, selection: MeterFormSelection, units: UnitDto[]) {
  if (!selection.unitId || !units.some((unit) => unit.id === selection.unitId)) {
    return;
  }
  meterFormSelectionByProperty.set(propertyId, selection);
}

function EditMeterDrawer({
  locale,
  propertyId,
  meter,
  t,
}: {
  locale: string;
  propertyId: string;
  meter: UnitMeterDto;
  t: ReturnType<typeof useTranslations>;
}) {
  const [state, action, pending] = useActionState(
    upsertMeterAction.bind(null, locale, propertyId),
    initial,
  );

  return (
    <FormDrawer mode="edit" title={t("editMeter")} helpTopicKey="meters" success={state.success}>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="unitId" value={meter.unitId} />
        <input type="hidden" name="kind" value={meter.kind} />
        <div className="grid gap-2">
          <Label>{t("unit")}</Label>
          <p className="text-sm font-medium">{meter.unitCode}</p>
        </div>
        <div className="grid gap-2">
          <Label>{t("kind")}</Label>
          <p className="text-sm font-medium">{t(`kindLabel.${meter.kind}`)}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`serial-${meter.id}`}>{t("serial")}</Label>
          <Input
            id={`serial-${meter.id}`}
            name="serialNumber"
            defaultValue={meter.serialNumber ?? ""}
            key={`${meter.id}-${meter.serialNumber ?? ""}`}
          />
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">
            {t(`errors.${state.error}`, { defaultMessage: state.error })}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {t("saveMeter")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function countBulkMeterStats(units: UnitDto[], meters: UnitMeterDto[], kind: MeterKind) {
  const updated = units.filter((unit) =>
    meters.some((meter) => meter.unitId === unit.id && meter.kind === kind),
  ).length;
  return {
    total: units.length,
    created: units.length - updated,
    updated,
  };
}

type Props = {
  locale: string;
  propertyId: string;
  meters: UnitMeterDto[];
  units: UnitDto[];
  readingsByMeterId: Record<string, MeterReadingDto[]>;
  canManageMeters?: boolean;
};

export function MetersAdminPanel({
  locale,
  propertyId,
  meters,
  units,
  readingsByMeterId,
  canManageMeters = true,
}: Props) {
  const t = useTranslations("meters");
  const tCommon = useTranslations("common");
  const sortedUnits = useMemo(() => sortUnitsByCode(units), [units]);
  const [meterState, meterAction, meterPending] = useActionState(
    upsertMeterAction.bind(null, locale, propertyId),
    initial,
  );
  const [bulkState, bulkAction, bulkPending] = useActionState(
    bulkUpsertMetersAction.bind(null, locale, propertyId),
    bulkInitial,
  );
  const initialSelection = resolveMeterFormSelection(propertyId, sortedUnits);
  const [unitId, setUnitId] = useState(initialSelection.unitId);
  const [kind, setKind] = useState<MeterKind>(initialSelection.kind);
  const bulkStats = useMemo(() => countBulkMeterStats(sortedUnits, meters, kind), [sortedUnits, meters, kind]);
  const kindLabel = t(`kindLabel.${kind}`);
  const existingSingleMeter = useMemo(
    () => meters.find((meter) => meter.unitId === unitId && meter.kind === kind),
    [meters, unitId, kind],
  );

  useEffect(() => {
    if (!meterState.success || !meterState.unitId) {
      return;
    }
    if (!sortedUnits.some((unit) => unit.id === meterState.unitId)) {
      return;
    }
    const nextKind = meterState.kind ?? kind;
    setUnitId(meterState.unitId);
    setKind(nextKind);
    persistMeterFormSelection(propertyId, { unitId: meterState.unitId, kind: nextKind }, sortedUnits);
  }, [meterState.success, meterState.unitId, meterState.kind, propertyId, sortedUnits, kind]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("listTitle")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <BulkMeterReadingsDrawer
              locale={locale}
              propertyId={propertyId}
              meters={meters}
              readingsByMeterId={readingsByMeterId}
            />
            {canManageMeters ? (
            <FormDrawer
              triggerLabel={t("addMeter")}
              title={t("addMeter")}
              helpTopicKey="meters"
              success={meterState.success || bulkState.success}
            >
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="single">{t("tabSingle")}</TabsTrigger>
                <TabsTrigger value="bulk">{t("tabBulk")}</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="mt-4">
                <form action={meterAction} className="grid gap-3">
                  <input type="hidden" name="unitId" value={unitId} />
                  <input type="hidden" name="kind" value={kind} />
                  <div className="grid gap-2">
                    <Label>{t("unit")}</Label>
                    <Select
                      value={unitId}
                      onValueChange={(nextUnitId) => {
                        setUnitId(nextUnitId);
                        persistMeterFormSelection(propertyId, { unitId: nextUnitId, kind }, sortedUnits);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("kind")}</Label>
                    <Select
                      value={kind}
                      onValueChange={(nextKind) => {
                        const parsedKind = nextKind as MeterKind;
                        setKind(parsedKind);
                        persistMeterFormSelection(propertyId, { unitId, kind: parsedKind }, sortedUnits);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(MeterKind).map((v) => (
                          <SelectItem key={v} value={v}>
                            {t(`kindLabel.${v}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="serial">{t("serial")}</Label>
                    <Input
                      id="serial"
                      name="serialNumber"
                      defaultValue={existingSingleMeter?.serialNumber ?? ""}
                      key={`${unitId}-${kind}-${existingSingleMeter?.serialNumber ?? ""}`}
                    />
                    <p className="text-sm text-muted-foreground">{t("singleUpdateHint")}</p>
                  </div>
                  {meterState.error ? (
                    <p className="text-sm text-destructive">
                      {t(`errors.${meterState.error}`, { defaultMessage: meterState.error })}
                    </p>
                  ) : null}
                  <Button type="submit" disabled={meterPending || sortedUnits.length === 0}>
                    {t("saveMeter")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="bulk" className="mt-4">
                <form action={bulkAction} className="grid gap-3">
                  <input type="hidden" name="kind" value={kind} />
                  <div className="grid gap-2">
                    <Label>{t("kind")}</Label>
                    <Select
                      value={kind}
                      onValueChange={(nextKind) => {
                        const parsedKind = nextKind as MeterKind;
                        setKind(parsedKind);
                        persistMeterFormSelection(propertyId, { unitId, kind: parsedKind }, sortedUnits);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(MeterKind).map((v) => (
                          <SelectItem key={v} value={v}>
                            {t(`kindLabel.${v}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">{t("bulkKindHint")}</p>
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                    <p className="font-medium">{t("bulkSummary", { total: bulkStats.total, kind: kindLabel })}</p>
                    {bulkStats.total > 0 ? (
                      <p className="mt-1 text-muted-foreground">
                        {t("bulkBreakdown", { created: bulkStats.created, updated: bulkStats.updated })}
                      </p>
                    ) : null}
                  </div>

                  {bulkState.error ? (
                    <p className="text-sm text-destructive">
                      {t(`errors.${bulkState.error}`, { defaultMessage: bulkState.error })}
                    </p>
                  ) : null}
                  {bulkState.success && bulkState.total != null ? (
                    <p className="text-sm text-muted-foreground">
                      {t("bulkSaved", {
                        total: bulkState.total,
                        created: bulkState.created ?? 0,
                        updated: bulkState.updated ?? 0,
                      })}
                    </p>
                  ) : null}
                  <Button type="submit" disabled={bulkPending || sortedUnits.length === 0} className="w-full">
                    {t("bulkCreateAll")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </FormDrawer>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {meters.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("unit")}</TableHead>
                  <TableHead>{t("kind")}</TableHead>
                  <TableHead>{t("serial")}</TableHead>
                  <TableHead>{t("readings")}</TableHead>
                  {canManageMeters ? (
                    <TableHead className="w-[1%] whitespace-nowrap">{tCommon("actions")}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {meters.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.unitCode}</TableCell>
                    <TableCell>{t(`kindLabel.${m.kind}`)}</TableCell>
                    <TableCell>{m.serialNumber ?? "—"}</TableCell>
                    <TableCell>
                      <MeterReadingsDrawer
                        locale={locale}
                        propertyId={propertyId}
                        meter={m}
                        readings={readingsByMeterId[m.id] ?? []}
                        canManageMeters={canManageMeters}
                      />
                    </TableCell>
                    {canManageMeters ? (
                      <TableCell>
                        <EditMeterDrawer locale={locale} propertyId={propertyId} meter={m} t={t} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
