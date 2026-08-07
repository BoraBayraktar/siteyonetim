"use client";

import { IncidentCategory, IncidentStatus } from "@siteyonetim/db";
import type { IncidentDto } from "@siteyonetim/itsm-incidents";
import type { PortalOccupancyDto } from "@siteyonetim/property-occupancy";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  createPortalIncidentAction,
  type PortalIncidentActionState,
} from "@/app/actions/portal-incidents";
import { FormDrawer } from "@/components/form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale: string;
  items: IncidentDto[];
  units: PortalOccupancyDto[];
  propertyNames: Record<string, string>;
  canCreate: boolean;
  fixedPropertyId?: string;
  fixedUnitId?: string;
};

const initial: PortalIncidentActionState = {};
const NO_UNIT = "__none__";

function statusVariant(status: IncidentStatus): "default" | "secondary" | "outline" {
  if (status === IncidentStatus.OPEN) return "default";
  if (status === IncidentStatus.IN_PROGRESS) return "secondary";
  return "outline";
}

function PortalIncidentCreateForm({
  locale,
  propertyId,
  units,
  fixedUnitId,
}: {
  locale: string;
  propertyId: string;
  units: PortalOccupancyDto[];
  fixedUnitId?: string;
}) {
  const t = useTranslations("incidents");
  const [state, action, pending] = useActionState(
    createPortalIncidentAction.bind(null, locale, propertyId),
    initial,
  );
  const propertyUnits = units.filter((unit) => unit.propertyId === propertyId);
  const [unitId, setUnitId] = useState(fixedUnitId ?? (propertyUnits.length === 1 ? propertyUnits[0]!.unitId : NO_UNIT));

  return (
    <form action={action} className="grid gap-3">
      {!fixedUnitId && propertyUnits.length > 1 ? (
        <>
          <input type="hidden" name="unitId" value={unitId === NO_UNIT ? "" : unitId} />
          <div className="grid gap-2">
            <Label>{t("fieldUnitOptional")}</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_UNIT}>{t("noUnit")}</SelectItem>
                {propertyUnits.map((unit) => (
                  <SelectItem key={unit.unitId} value={unit.unitId}>
                    {unit.blockName ? `${unit.blockName} / ${unit.unitCode}` : unit.unitCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="portal-incident-title">{t("fieldTitle")}</Label>
        <Input id="portal-incident-title" name="title" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="portal-incident-description">{t("fieldDescription")}</Label>
        <Textarea id="portal-incident-description" name="description" rows={4} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="portal-incident-category">{t("fieldCategory")}</Label>
        <Select name="category" defaultValue={IncidentCategory.OTHER}>
          <SelectTrigger id="portal-incident-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(IncidentCategory).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`category.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
      ) : null}
      {state.success ? <p className="text-sm text-muted-foreground">{t("portalCreateSuccess")}</p> : null}
      <Button type="submit" disabled={pending}>
        {t("submitCreate")}
      </Button>
    </form>
  );
}

export function PortalIncidentsSection({
  locale,
  items,
  units,
  propertyNames,
  canCreate,
  fixedPropertyId,
  fixedUnitId,
}: Props) {
  const t = useTranslations("incidents");
  const tPortal = useTranslations("portal");

  const createTargets = fixedPropertyId
    ? [fixedPropertyId]
    : [...new Set(units.map((unit) => unit.propertyId))];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{tPortal("incidentsTitle")}</CardTitle>
          <CardDescription>{tPortal("incidentsSubtitle")}</CardDescription>
        </div>
        {canCreate && createTargets.length === 1 ? (
          <FormDrawer triggerLabel={t("createTitle")} title={t("createTitle")}>
            <PortalIncidentCreateForm
              locale={locale}
              propertyId={createTargets[0]!}
              units={units}
              fixedUnitId={fixedUnitId}
            />
          </FormDrawer>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {canCreate && createTargets.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {createTargets.map((propertyId) => (
              <FormDrawer
                key={propertyId}
                triggerLabel={tPortal("incidentsCreateFor", { property: propertyNames[propertyId] ?? propertyId })}
                title={t("createTitle")}
              >
                <PortalIncidentCreateForm locale={locale} propertyId={propertyId} units={units} />
              </FormDrawer>
            ))}
          </div>
        ) : null}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tPortal("incidentsEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {propertyNames[item.propertyId] ?? item.propertyId}
                      {item.unitCode ? ` · ${item.unitCode}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{t(`status.${item.status}`)}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{item.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(`category.${item.category}`)} · {new Date(item.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
