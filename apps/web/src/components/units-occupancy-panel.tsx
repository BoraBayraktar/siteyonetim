"use client";

import { OccupancyRole } from "@siteyonetim/db";
import type { BlockDto } from "@siteyonetim/property-core";
import type { PartyDto } from "@siteyonetim/property-parties";
import type { UnitOccupancyBoardRowDto, UnitOccupancyDetailDto } from "@siteyonetim/property-occupancy";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState, type ReactNode } from "react";

import {
  getUnitOccupancyDetailAction,
  setUnitRoleOccupancyAction,
  type ActionState,
} from "@/app/actions/property-detail";
import { FormDrawer } from "@/components/form-drawer";
import { PartyCombobox } from "@/components/party-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  propertyId: string;
  unitBoard: UnitOccupancyBoardRowDto[];
  blocks: BlockDto[];
  partyOptions: PartyDto[];
  toolbar?: ReactNode;
};

const initial: ActionState = {};

function ErrorText({ code, ns }: { code?: string; ns: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{ns(`errors.${code}`, { defaultMessage: code })}</p>;
}

function occupancyStatusLabel(
  status: UnitOccupancyBoardRowDto["occupancyStatus"],
  t: ReturnType<typeof useTranslations<"propertyDetail">>,
) {
  if (status === "FULL") return t("occupancyStatusFull");
  if (status === "PARTIAL") return t("occupancyStatusPartial");
  return t("occupancyStatusEmpty");
}

function UnitRoleAssignDrawer({
  locale,
  propertyId,
  unit,
  role,
  slot,
  partyOptions,
  t,
}: {
  locale: string;
  propertyId: string;
  unit: UnitOccupancyBoardRowDto;
  role: OccupancyRole;
  slot: UnitOccupancyBoardRowDto["owner"];
  partyOptions: PartyDto[];
  t: ReturnType<typeof useTranslations<"propertyDetail">>;
}) {
  const [partyMode, setPartyMode] = useState<"existing" | "new">("new");
  const [partyId, setPartyId] = useState("");
  const [state, action, pending] = useActionState(
    setUnitRoleOccupancyAction.bind(null, locale, propertyId),
    initial,
  );
  const roleLabel = role === OccupancyRole.OWNER ? t("roleOwner") : t("roleTenant");

  return (
    <FormDrawer
      triggerLabel={slot ? slot.partyName : t("assignRole", { role: roleLabel })}
      title={t("assignRoleTitle", { unit: unit.code, role: roleLabel })}
      helpTopicKey="units"
      success={state.success}
    >
      <form action={action} className="grid gap-3">
        <input type="hidden" name="unitId" value={unit.unitId} />
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="partyMode" value={partyMode} />

        <div className="grid gap-2">
          <Label>{t("assignPartyMode")}</Label>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setPartyMode("new")}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent",
                partyMode === "new" && "border-primary bg-accent",
              )}
            >
              <p className="font-medium">{t("assignPartyModeNew")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("assignPartyModeNewHint")}</p>
            </button>
            <button
              type="button"
              onClick={() => setPartyMode("existing")}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent",
                partyMode === "existing" && "border-primary bg-accent",
              )}
            >
              <p className="font-medium">{t("assignPartyModeExisting")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("assignPartyModeExistingHint")}</p>
            </button>
          </div>
        </div>

        {partyMode === "new" ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor={`assign-name-${unit.unitId}-${role}`}>{t("partyName")}</Label>
              <Input
                id={`assign-name-${unit.unitId}-${role}`}
                name="displayName"
                defaultValue={slot?.partyName ?? ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`assign-email-${unit.unitId}-${role}`}>{t("email")}</Label>
              <Input id={`assign-email-${unit.unitId}-${role}`} name="email" type="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`assign-phone-${unit.unitId}-${role}`}>{t("phone")}</Label>
              <Input id={`assign-phone-${unit.unitId}-${role}`} name="phone" />
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            <Label>{t("selectParty")}</Label>
            <PartyCombobox
              parties={partyOptions}
              value={partyId}
              onValueChange={setPartyId}
              placeholder={t("selectParty")}
            />
            <input type="hidden" name="partyId" value={partyId} />
          </div>
        )}

        <ErrorText code={state.error} ns={t} />
        <Button type="submit" disabled={pending || (partyMode === "existing" && !partyId)} className="w-full sm:w-auto">
          {t("assignSubmit")}
        </Button>
      </form>

      {slot ? (
        <form action={action} className="mt-4 border-t pt-4">
          <input type="hidden" name="unitId" value={unit.unitId} />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="clear" value="1" />
          <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
            {t("clearRole", { role: roleLabel })}
          </Button>
        </form>
      ) : null}
    </FormDrawer>
  );
}

function UnitDetailSheet({
  locale,
  propertyId,
  unitId,
  open,
  onOpenChange,
}: {
  locale: string;
  propertyId: string;
  unitId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("propertyDetail");
  const [detail, setDetail] = useState<UnitOccupancyDetailDto | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !unitId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getUnitOccupancyDetailAction(propertyId, unitId).then((row) => {
      if (!cancelled) {
        setDetail(row);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, unitId, propertyId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{detail ? t("unitDetailTitle", { code: detail.code }) : t("unitDetailLoading")}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 max-h-[calc(100vh-8rem)] pr-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("unitDetailLoading")}</p>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-1">
                <p>
                  <span className="text-muted-foreground">{t("block")}: </span>
                  {detail.blockName ?? t("noBlock")}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("floor")}: </span>
                  {detail.floor ?? "—"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">{t("currentAssignments")}</p>
                <p>
                  {t("roleOwner")}: {detail.owner?.partyName ?? "—"}
                </p>
                <p>
                  {t("roleTenant")}: {detail.tenant?.partyName ?? "—"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${locale}/admin/properties/${propertyId}/dues?tab=register&unitId=${detail.unitId}`}>
                    {t("openUnitDebt")}
                  </Link>
                </Button>
              </div>

              <div className="space-y-2">
                <p className="font-medium">{t("occupancyHistory")}</p>
                {detail.history.length === 0 ? (
                  <p className="text-muted-foreground">{t("occupancyHistoryEmpty")}</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.history.map((item) => (
                      <li key={item.id} className="rounded-md border px-3 py-2">
                        <p className="font-medium">{item.partyName}</p>
                        <p className="text-muted-foreground">
                          {item.role === OccupancyRole.OWNER ? t("roleOwner") : t("roleTenant")} ·{" "}
                          {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US").format(item.startDate)} →{" "}
                          {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US").format(item.endDate)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("unitDetailNotFound")}</p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function UnitsOccupancyPanel({ locale, propertyId, unitBoard, blocks, partyOptions, toolbar }: Props) {
  const t = useTranslations("propertyDetail");
  const tCommon = useTranslations("common");
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [detailUnitId, setDetailUnitId] = useState<string | null>(null);

  const filtered = unitBoard.filter((row) => {
    if (blockFilter !== "all" && row.blockId !== blockFilter) return false;
    if (unassignedOnly && row.owner) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("unitsBoardTitle")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("unitsBoardSubtitle")}</p>
        </div>
        {toolbar ? <div className="flex flex-wrap gap-2">{toolbar}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-[10rem] gap-2">
            <Label>{t("blockFilter")}</Label>
            <Select value={blockFilter} onValueChange={setBlockFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allBlocks")}</SelectItem>
                {blocks.map((block) => (
                  <SelectItem key={block.id} value={block.id}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={unassignedOnly} onCheckedChange={(v) => setUnassignedOnly(v === true)} />
            {t("unassignedOnly")}
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">{tCommon("none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("unitCode")}</TableHead>
                  <TableHead>{t("block")}</TableHead>
                  <TableHead>{t("roleOwner")}</TableHead>
                  <TableHead>{t("roleTenant")}</TableHead>
                  <TableHead>{t("occupancyStatus")}</TableHead>
                  <TableHead className="sr-only">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.unitId}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="h-auto p-0 font-medium"
                        onClick={() => setDetailUnitId(row.unitId)}
                      >
                        {row.code}
                      </Button>
                    </TableCell>
                    <TableCell>{row.blockName ?? t("noBlock")}</TableCell>
                    <TableCell>
                      <UnitRoleAssignDrawer
                        locale={locale}
                        propertyId={propertyId}
                        unit={row}
                        role={OccupancyRole.OWNER}
                        slot={row.owner}
                        partyOptions={partyOptions}
                        t={t}
                      />
                    </TableCell>
                    <TableCell>
                      <UnitRoleAssignDrawer
                        locale={locale}
                        propertyId={propertyId}
                        unit={row}
                        role={OccupancyRole.TENANT}
                        slot={row.tenant}
                        partyOptions={partyOptions}
                        t={t}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{occupancyStatusLabel(row.occupancyStatus, t)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setDetailUnitId(row.unitId)}>
                        {t("unitDetailOpen")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <UnitDetailSheet
        locale={locale}
        propertyId={propertyId}
        unitId={detailUnitId}
        open={detailUnitId != null}
        onOpenChange={(next) => {
          if (!next) setDetailUnitId(null);
        }}
      />
    </Card>
  );
}
