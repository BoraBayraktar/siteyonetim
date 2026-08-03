"use client";

import type { MeterReadingDto, UnitMeterDto } from "@siteyonetim/property-meters";
import { Gauge } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  deleteMeterReadingAction,
  recordMeterReadingAction,
  type MeterActionState,
} from "@/app/actions/meters";
import { MeterIndexInput } from "@/components/meter-index-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initial: MeterActionState = {};

type ReadingRow = MeterReadingDto & { consumption: string | null };

function formatPeriod(month: number, year: number) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

function enrichReadingsWithConsumption(readings: MeterReadingDto[]): ReadingRow[] {
  const asc = [...readings].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  const consumptionById = new Map<string, string | null>();

  for (let i = 0; i < asc.length; i += 1) {
    if (i === 0) {
      consumptionById.set(asc[i]!.id, null);
      continue;
    }
    const delta = Number(asc[i]!.readingValue) - Number(asc[i - 1]!.readingValue);
    consumptionById.set(asc[i]!.id, delta > 0 ? String(delta) : null);
  }

  return [...readings]
    .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month))
    .map((reading) => ({
      ...reading,
      consumption: consumptionById.get(reading.id) ?? null,
    }));
}

function ReadingForm({
  locale,
  propertyId,
  meter,
  editing,
  onCancelEdit,
  onSuccess,
  t,
}: {
  locale: string;
  propertyId: string;
  meter: UnitMeterDto;
  editing: MeterReadingDto | null;
  onCancelEdit: () => void;
  onSuccess: () => void;
  t: ReturnType<typeof useTranslations<"meters">>;
}) {
  const now = new Date();
  const [state, action, pending] = useActionState(
    recordMeterReadingAction.bind(null, locale, propertyId),
    initial,
  );

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [state.success, onSuccess]);

  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-muted/30 p-4">
      <input type="hidden" name="meterId" value={meter.id} />
      <p className="text-sm font-medium">{editing ? t("editReading") : t("addReading")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor={`year-${meter.id}`}>{t("year")}</Label>
          <Input
            id={`year-${meter.id}`}
            name="year"
            type="number"
            defaultValue={editing?.year ?? now.getFullYear()}
            required
            readOnly={Boolean(editing)}
            className={editing ? "bg-muted" : undefined}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`month-${meter.id}`}>{t("month")}</Label>
          <Input
            id={`month-${meter.id}`}
            name="month"
            type="number"
            min={1}
            max={12}
            defaultValue={editing?.month ?? now.getMonth() + 1}
            required
            readOnly={Boolean(editing)}
            className={editing ? "bg-muted" : undefined}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`value-${meter.id}`}>{t("readingValue")}</Label>
        <MeterIndexInput
          id={`value-${meter.id}`}
          name="readingValue"
          defaultValue={editing?.readingValue ?? ""}
          required
          placeholder="0"
          key={editing?.id ?? "new"}
        />
        <p className="text-xs text-muted-foreground">{t("readingValueHint")}</p>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} size="sm">
          {editing ? t("saveReading") : t("addReading")}
        </Button>
        {editing ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>
            {t("cancelEdit")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function DeleteReadingButton({
  locale,
  propertyId,
  readingId,
  onSuccess,
  t,
  tCommon,
}: {
  locale: string;
  propertyId: string;
  readingId: string;
  onSuccess: () => void;
  t: ReturnType<typeof useTranslations<"meters">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
}) {
  const [state, action, pending] = useActionState(
    deleteMeterReadingAction.bind(null, locale, propertyId, readingId),
    initial,
  );

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [state.success, onSuccess]);

  return (
    <form action={action}>
      <Button type="submit" variant="ghost" size="sm" disabled={pending} className="text-destructive hover:text-destructive">
        {tCommon("delete")}
      </Button>
    </form>
  );
}

type Props = {
  locale: string;
  propertyId: string;
  meter: UnitMeterDto;
  readings: MeterReadingDto[];
};

export function MeterReadingsDrawer({ locale, propertyId, meter, readings }: Props) {
  const t = useTranslations("meters");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeterReadingDto | null>(null);

  const rows = useMemo(() => enrichReadingsWithConsumption(readings), [readings]);

  const refresh = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Gauge className="size-4" aria-hidden />
        {t("readings")}
      </Button>
      <Sheet open={open} onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setEditing(null);
        }
      }}>
        <SheetContent side="right" className="flex h-full max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b px-4 py-4 pr-20 text-left">
            <SheetTitle>{t("readingsDrawerTitle", { unit: meter.unitCode, kind: t(`kindLabel.${meter.kind}`) })}</SheetTitle>
            <SheetDescription>{t("readingsDrawerHint")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-6 pb-8">
              <ReadingForm
                locale={locale}
                propertyId={propertyId}
                meter={meter}
                editing={editing}
                onCancelEdit={() => setEditing(null)}
                onSuccess={refresh}
                t={t}
              />

              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noReadings")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("period")}</TableHead>
                      <TableHead>{t("readingValue")}</TableHead>
                      <TableHead>{t("consumption")}</TableHead>
                      <TableHead className="w-[1%] whitespace-nowrap">{tCommon("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatPeriod(row.month, row.year)}</TableCell>
                        <TableCell className="font-medium">{row.readingValue}</TableCell>
                        <TableCell>{row.consumption ?? t("consumptionNone")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(row)}>
                              {tCommon("edit")}
                            </Button>
                            <DeleteReadingButton
                              locale={locale}
                              propertyId={propertyId}
                              readingId={row.id}
                              onSuccess={refresh}
                              t={t}
                              tCommon={tCommon}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
