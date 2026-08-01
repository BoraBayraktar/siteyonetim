"use client";

import { MeterKind } from "@siteyonetim/db";
import type { MeterReadingDto, UnitMeterDto } from "@siteyonetim/property-meters";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";

import { bulkRecordMeterReadingsAction, type BulkReadingActionState } from "@/app/actions/meters";
import { MeterIndexInput, sanitizeMeterIndexInput } from "@/components/meter-index-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initial: BulkReadingActionState = {};

type Props = {
  locale: string;
  propertyId: string;
  meters: UnitMeterDto[];
  readingsByMeterId: Record<string, MeterReadingDto[]>;
};

function prevPeriod(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function readingForPeriod(
  readingsByMeterId: Record<string, MeterReadingDto[]>,
  meterId: string,
  year: number,
  month: number,
) {
  return readingsByMeterId[meterId]?.find((reading) => reading.year === year && reading.month === month)?.readingValue ?? "";
}

function parseIndex(value: string): number | null {
  const raw = value.trim().replace(",", ".");
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

type ConsumptionPreviewResult =
  | { kind: "value"; value: string }
  | { kind: "message"; messageKey: string };

function resolveConsumptionPreview(previousIndex: string, currentIndex: string): ConsumptionPreviewResult {
  const prev = parseIndex(previousIndex);
  const cur = parseIndex(currentIndex);

  if (prev == null && cur == null) {
    return { kind: "message", messageKey: "consumptionPreviewEmpty" };
  }
  if (prev == null) {
    return { kind: "message", messageKey: "consumptionNeedsPreviousMonthShort" };
  }
  if (cur == null) {
    return { kind: "message", messageKey: "consumptionPreviewPending" };
  }
  if (cur < prev) {
    return { kind: "message", messageKey: "consumptionPreviewNegative" };
  }

  return { kind: "value", value: String(cur - prev) };
}

export function BulkMeterReadingsDrawer({ locale, propertyId, meters, readingsByMeterId }: Props) {
  const t = useTranslations("meters");
  const router = useRouter();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MeterKind>(MeterKind.HOT_WATER);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [state, action, pending] = useActionState(
    bulkRecordMeterReadingsAction.bind(null, locale, propertyId),
    initial,
  );

  const metersForKind = useMemo(
    () => meters.filter((meter) => meter.kind === kind),
    [meters, kind],
  );

  const previousPeriod = useMemo(() => prevPeriod(year, month), [year, month]);

  const formKey = `${kind}-${year}-${month}-${open ? "open" : "closed"}`;

  const [draftByMeterId, setDraftByMeterId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    for (const meter of meters.filter((item) => item.kind === kind)) {
      initial[meter.id] = readingForPeriod(readingsByMeterId, meter.id, year, month);
    }
    setDraftByMeterId(initial);
  }, [open, formKey, kind, meters, readingsByMeterId, year, month]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      setOpen(false);
    }
  }, [state.success, router]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <ClipboardList className="size-4" aria-hidden />
        {t("bulkReadings")}
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
        }}
      >
        <SheetContent side="right" className="flex h-full max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b px-4 py-4 text-left">
            <SheetTitle>{t("bulkReadingsTitle")}</SheetTitle>
            <SheetDescription>{t("bulkReadingsHint")}</SheetDescription>
          </SheetHeader>

          <form action={action} className="flex min-h-0 flex-1 flex-col" key={formKey}>
            <input type="hidden" name="kind" value={kind} />

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>{t("kind")}</Label>
                    <Select value={kind} onValueChange={(value) => setKind(value as MeterKind)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(MeterKind).map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(`kindLabel.${value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bulk-year">{t("year")}</Label>
                    <Input
                      id="bulk-year"
                      name="year"
                      type="number"
                      value={year}
                      onChange={(event) => setYear(Number(event.target.value))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bulk-month">{t("month")}</Label>
                    <Input
                      id="bulk-month"
                      name="month"
                      type="number"
                      min={1}
                      max={12}
                      value={month}
                      onChange={(event) => setMonth(Number(event.target.value))}
                      required
                    />
                  </div>
                </div>

                {metersForKind.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("bulkReadingsNoMeters")}</p>
                ) : (
                  <>
                    {(() => {
                      let totalConsumption = 0;
                      const previewStats = metersForKind.reduce(
                        (acc, meter) => {
                          const previousIndex = readingForPeriod(
                            readingsByMeterId,
                            meter.id,
                            previousPeriod.year,
                            previousPeriod.month,
                          );
                          const currentIndex = draftByMeterId[meter.id] ?? "";
                          const preview = resolveConsumptionPreview(previousIndex, currentIndex);
                          if (preview.kind === "value") {
                            acc.ok += 1;
                            totalConsumption += Number(preview.value);
                          } else if (preview.messageKey === "consumptionNeedsPreviousMonthShort") acc.missingPrev += 1;
                          else if (preview.messageKey === "consumptionPreviewPending") acc.missingCurrent += 1;
                          else if (preview.messageKey === "consumptionPreviewNegative") acc.negative += 1;
                          else acc.empty += 1;
                          return acc;
                        },
                        { ok: 0, missingPrev: 0, missingCurrent: 0, negative: 0, empty: 0 },
                      );
                      const issues =
                        previewStats.missingPrev +
                        previewStats.missingCurrent +
                        previewStats.negative +
                        previewStats.empty;
                      return (
                        <div className="space-y-2">
                          {previewStats.ok > 0 ? (
                            <p className="text-sm font-medium">
                              {t("bulkReadingsComputedTotalM3", {
                                total: totalConsumption.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                                count: previewStats.ok,
                              })}
                            </p>
                          ) : null}
                          {issues > 0 ? (
                            <p className="text-sm text-amber-600 dark:text-amber-500">
                              {t("bulkReadingsPreviewSummary", {
                                ok: previewStats.ok,
                                total: metersForKind.length,
                                missingPrev: previewStats.missingPrev,
                                missingCurrent: previewStats.missingCurrent,
                                negative: previewStats.negative,
                                previousPeriod: `${String(previousPeriod.month).padStart(2, "0")}/${previousPeriod.year}`,
                              })}
                            </p>
                          ) : null}
                          {previewStats.ok > 0 ? (
                            <p className="text-xs text-muted-foreground">{t("bulkReadingsInvoiceCompareHint")}</p>
                          ) : null}
                        </div>
                      );
                    })()}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("unit")}</TableHead>
                        <TableHead>{t("serial")}</TableHead>
                        <TableHead>
                          {t("previousIndexCol", {
                            period: `${String(previousPeriod.month).padStart(2, "0")}/${previousPeriod.year}`,
                          })}
                        </TableHead>
                        <TableHead>{t("readingValue")}</TableHead>
                        <TableHead>{t("consumptionPreview")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metersForKind.map((meter) => {
                        const previousIndex = readingForPeriod(
                          readingsByMeterId,
                          meter.id,
                          previousPeriod.year,
                          previousPeriod.month,
                        );
                        const currentIndex = draftByMeterId[meter.id] ?? "";
                        const preview = resolveConsumptionPreview(previousIndex, currentIndex);
                        return (
                        <TableRow key={meter.id}>
                          <TableCell className="font-medium">{meter.unitCode}</TableCell>
                          <TableCell>{meter.serialNumber ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{previousIndex || "—"}</TableCell>
                          <TableCell>
                          <MeterIndexInput
                            name={`reading_${meter.id}`}
                            value={currentIndex}
                            onChange={(event) => {
                              const nextValue = sanitizeMeterIndexInput(event.target.value);
                              setDraftByMeterId((prev) => ({
                                ...prev,
                                [meter.id]: nextValue,
                              }));
                            }}
                            placeholder="0"
                            aria-label={`${meter.unitCode} ${t("readingValue")}`}
                          />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {preview.kind === "value" ? preview.value : t(preview.messageKey)}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t bg-background px-4 py-4">
              {state.error ? (
                <p className="text-sm text-destructive">
                  {t(`errors.${state.error}`, { defaultMessage: state.error })}
                </p>
              ) : null}
              {state.success && state.saved != null ? (
                <p className="text-sm text-muted-foreground">
                  {t("bulkReadingsSaved", {
                    saved: state.saved,
                    skipped: state.skipped ?? 0,
                    total: state.totalMeters ?? metersForKind.length,
                  })}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending || metersForKind.length === 0}>
                  {t("bulkReadingsSave")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("bulkReadingsClose")}
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
