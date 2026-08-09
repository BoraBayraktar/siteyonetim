"use client";

import { PartyType } from "@siteyonetim/db";
import type { BlockDto, UnitDto } from "@siteyonetim/property-core";
import type { PartyDto } from "@siteyonetim/property-parties";
import type { UnitOccupancyBoardRowDto } from "@siteyonetim/property-occupancy";
import type { PropertyStaffOpsProfileDto, PropertyUtilityProfileDto } from "@siteyonetim/property-settings";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createBlockAction,
  createPartyAction,
  createUnitAction,
  deleteBlockAction,
  deletePartyAction,
  deleteUnitAction,
  importUnitsExcelAction,
  importPartiesExcelAction,
  invitePortalAction,
  updateBlockAction,
  updatePartyAction,
  updateUnitAction,
  type ActionState,
} from "@/app/actions/property-detail";
import { FormDrawer } from "@/components/form-drawer";
import { PartyCombobox } from "@/components/party-combobox";
import { PropertyStaffOpsPanel } from "@/components/property-staff-ops-panel";
import { PropertyUtilityPanel } from "@/components/property-utility-panel";
import { UnitsOccupancyPanel } from "@/components/units-occupancy-panel";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolvePropertyStructureTab, resolveStructureSection } from "@/lib/property-structure-tab";

type Props = {
  locale: string;
  propertyId: string;
  defaultTab?: string;
  blocks: BlockDto[];
  unitBoard: UnitOccupancyBoardRowDto[];
  propertyParties: PartyDto[];
  orgParties: PartyDto[];
  utilityProfile: PropertyUtilityProfileDto | null;
  staffOpsProfile: PropertyStaffOpsProfileDto | null;
};

const initial: ActionState = {};

function ErrorText({ code, ns }: { code?: string; ns: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{ns(`errors.${code}`, { defaultMessage: code })}</p>;
}

export function PropertyDetailTabs({
  locale,
  propertyId,
  defaultTab,
  blocks,
  unitBoard,
  propertyParties,
  orgParties,
  utilityProfile,
  staffOpsProfile,
}: Props) {
  const t = useTranslations("propertyDetail");
  const tPh = useTranslations("placeholders");
  const outerTab = useMemo(() => resolvePropertyStructureTab(defaultTab), [defaultTab]);
  const structureSection = useMemo(() => resolveStructureSection(defaultTab), [defaultTab]);

  const [blockState, blockAction, blockPending] = useActionState(
    createBlockAction.bind(null, locale, propertyId),
    initial,
  );
  const [unitState, unitAction, unitPending] = useActionState(
    createUnitAction.bind(null, locale, propertyId),
    initial,
  );
  const [partyState, partyAction, partyPending] = useActionState(
    createPartyAction.bind(null, locale, propertyId),
    initial,
  );
  const [inviteState, inviteAction, invitePending] = useActionState(
    invitePortalAction.bind(null, locale, propertyId),
    initial,
  );

  return (
    <div className="w-full space-y-4">
      {outerTab === "structure" && structureSection === "blocks" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("tabBlocks")}</CardTitle>
            <FormDrawer triggerLabel={t("addBlock")} title={t("addBlock")} success={blockState.success}>
              <form action={blockAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="block-name">{t("blockName")}</Label>
                  <Input id="block-name" name="name" placeholder={tPh("blockName")} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sort-order">{t("sortOrder")}</Label>
                  <Input id="sort-order" name="sortOrder" type="number" defaultValue={0} />
                </div>
                <ErrorText code={blockState.error} ns={t} />
                <Button type="submit" disabled={blockPending} className="w-full sm:w-auto">
                  {t("addBlock")}
                </Button>
              </form>
            </FormDrawer>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ul className="space-y-2 text-sm">
              {blocks.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <span>{b.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{b.unitCount}</span>
                    <BlockEditDrawer locale={locale} propertyId={propertyId} block={b} t={t} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {outerTab === "structure" && structureSection === "units" ? (
        <UnitsOccupancyPanel
          locale={locale}
          propertyId={propertyId}
          unitBoard={unitBoard}
          blocks={blocks}
          partyOptions={orgParties}
          toolbar={
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/properties/${propertyId}/units/export?locale=${locale}&template=1`}>
                  {t("exportUnitsTemplate")}
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/properties/${propertyId}/units/export?locale=${locale}`}>{t("exportUnitsExcel")}</a>
              </Button>
              <UnitExcelImportDrawer locale={locale} propertyId={propertyId} t={t} />
              <UnitCreateDrawer t={t} blocks={blocks} state={unitState} action={unitAction} pending={unitPending} />
            </>
          }
        />
      ) : null}

      {outerTab === "structure" && structureSection === "parties" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{t("propertyPartiesTitle")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t("propertyPartiesSubtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <OrgPartiesDrawer
                locale={locale}
                propertyId={propertyId}
                parties={orgParties}
                t={t}
                inviteState={inviteState}
                inviteAction={inviteAction}
                invitePending={invitePending}
                partyState={partyState}
                partyAction={partyAction}
                partyPending={partyPending}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {propertyParties.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">{t("propertyPartiesEmpty")}</p>
            ) : (
              propertyParties.map((p) => (
                <div key={p.id} className="flex flex-wrap items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <div className="font-medium">{p.displayName}</div>
                    <div className="text-muted-foreground">
                      {p.email ?? "—"}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </div>
                    <div className="text-muted-foreground">
                      {t("hasPortal")}: {p.hasPortalAccess ? t("yes") : t("no")}
                    </div>
                  </div>
                  <PartyEditDrawer locale={locale} propertyId={propertyId} party={p} t={t} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {outerTab === "utility" ? (
        <div className="space-y-4">
          <PropertyUtilityPanel locale={locale} propertyId={propertyId} profile={utilityProfile} />
          {staffOpsProfile ? (
            <PropertyStaffOpsPanel locale={locale} propertyId={propertyId} profile={staffOpsProfile} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UnitCreateDrawer({
  t,
  blocks,
  state,
  action,
  pending,
}: {
  t: ReturnType<typeof useTranslations>;
  blocks: BlockDto[];
  state: ActionState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const [blockId, setBlockId] = useState("");

  return (
    <FormDrawer triggerLabel={t("addUnit")} title={t("addUnit")} success={state.success}>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="blockId" value={blockId} />
        <div className="grid gap-2">
          <Label htmlFor="unit-code">{t("unitCode")}</Label>
          <Input id="unit-code" name="code" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit-block">{t("block")}</Label>
          <Select value={blockId} onValueChange={setBlockId}>
            <SelectTrigger id="unit-block">
              <SelectValue placeholder={t("noBlock")} />
            </SelectTrigger>
            <SelectContent>
              {blocks.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="floor">{t("floor")}</Label>
          <Input id="floor" name="floor" type="number" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="area">{t("areaM2")}</Label>
          <Input id="area" name="areaM2" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="share">{t("shareRatio")}</Label>
          <Input id="share" name="shareRatio" />
        </div>
        <ErrorText code={state.error} ns={t} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {t("addUnit")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function PartyCreateDrawer({
  t,
  state,
  action,
  pending,
}: {
  t: ReturnType<typeof useTranslations>;
  state: ActionState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const [partyType, setPartyType] = useState<PartyType>(PartyType.PERSON);
  const [communicationConsent, setCommunicationConsent] = useState(false);

  return (
    <FormDrawer triggerLabel={t("addParty")} title={t("addParty")} success={state.success}>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="type" value={partyType} />
        <input type="hidden" name="communicationConsent" value={communicationConsent ? "on" : ""} />
        <div className="grid gap-2">
          <Label htmlFor="party-type">{t("partyType")}</Label>
          <Select value={partyType} onValueChange={(v) => setPartyType(v as PartyType)}>
            <SelectTrigger id="party-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PartyType.PERSON}>{t("partyPerson")}</SelectItem>
              <SelectItem value={PartyType.COMPANY}>{t("partyCompany")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="display-name">{t("displayName")}</Label>
          <Input id="display-name" name="displayName" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="party-email">{t("email")}</Label>
          <Input id="party-email" name="email" type="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="party-phone">{t("phone")}</Label>
          <Input id="party-phone" name="phone" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="party-consent"
            checked={communicationConsent}
            onCheckedChange={(v) => setCommunicationConsent(v === true)}
          />
          <Label htmlFor="party-consent" className="font-normal">
            {t("communicationConsent")}
          </Label>
        </div>
        <ErrorText code={state.error} ns={t} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {t("addParty")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function PartyInviteDrawer({
  t,
  parties,
  state,
  action,
  pending,
}: {
  t: ReturnType<typeof useTranslations>;
  parties: PartyDto[];
  state: ActionState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const [partyId, setPartyId] = useState(parties[0]?.id ?? "");

  return (
    <FormDrawer
      triggerLabel={t("portalInvite")}
      title={t("portalInvite")}
      success={state.success}
      disabled={parties.length === 0}
    >
      <form action={action} className="grid gap-3">
        <input type="hidden" name="partyId" value={partyId} />
        <div className="grid gap-2">
          <Label htmlFor="invite-party">{t("displayName")}</Label>
          <PartyCombobox
            id="invite-party"
            parties={parties.map((p) => ({ id: p.id, displayName: p.displayName }))}
            value={partyId}
            onValueChange={setPartyId}
            placeholder={t("selectParty")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-email">{t("email")}</Label>
          <Input id="invite-email" name="email" type="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-name">{t("portalName")}</Label>
          <Input id="invite-name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-password">{t("portalPassword")}</Label>
          <Input id="invite-password" name="password" type="password" minLength={8} required />
        </div>
        <ErrorText code={state.error} ns={t} />
        <Button type="submit" disabled={pending || parties.length === 0} className="w-full sm:w-auto">
          {t("inviteSubmit")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function OrgPartiesDrawer({
  locale,
  propertyId,
  parties,
  t,
  inviteState,
  inviteAction,
  invitePending,
  partyState,
  partyAction,
  partyPending,
}: {
  locale: string;
  propertyId: string;
  parties: PartyDto[];
  t: ReturnType<typeof useTranslations>;
  inviteState: ActionState;
  inviteAction: (payload: FormData) => void;
  invitePending: boolean;
  partyState: ActionState;
  partyAction: (payload: FormData) => void;
  partyPending: boolean;
}) {
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (inviteState.success || partyState.success) {
      setOpen(false);
    }
  }, [inviteState.success, partyState.success]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("orgPartiesOpen")}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("orgPartiesTitle")}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 max-h-[calc(100vh-8rem)] pr-3">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("orgPartiesHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/properties/${propertyId}/parties/export?locale=${locale}&template=1`}>
                    {t("exportPartiesTemplate")}
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/properties/${propertyId}/parties/export?locale=${locale}`}>{t("exportPartiesExcel")}</a>
                </Button>
                <PartyExcelImportDrawer locale={locale} propertyId={propertyId} t={t} />
                <PartyInviteDrawer
                  t={t}
                  parties={parties.filter((p) => !p.hasPortalAccess)}
                  state={inviteState}
                  action={inviteAction}
                  pending={invitePending}
                />
                <PartyCreateDrawer t={t} state={partyState} action={partyAction} pending={partyPending} />
              </div>
              <ul className="space-y-2 text-sm">
                {parties.map((party) => (
                  <li key={party.id} className="flex flex-wrap items-start justify-between gap-2 border-b pb-2">
                    <div>
                      <p className="font-medium">{party.displayName}</p>
                      <p className="text-muted-foreground">
                        {party.email ?? "—"}
                        {party.phone ? ` · ${party.phone}` : ""}
                      </p>
                    </div>
                    <PartyEditDrawer locale={locale} propertyId={propertyId} party={party} t={t} />
                  </li>
                ))}
                {parties.length === 0 ? (
                  <li className="py-4 text-center text-muted-foreground">{tCommon("none")}</li>
                ) : null}
              </ul>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DeleteEntityForm({
  confirmMessage,
  label,
  error,
  ns,
  action,
  pending,
}: {
  confirmMessage: string;
  label: string;
  error?: string;
  ns: ReturnType<typeof useTranslations>;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  return (
    <form
      action={action}
      className="mt-4 border-t pt-4"
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <ErrorText code={error} ns={ns} />
      <Button type="submit" variant="destructive" disabled={pending} className="w-full sm:w-auto">
        {label}
      </Button>
    </form>
  );
}

function BlockEditDrawer({
  locale,
  propertyId,
  block,
  t,
}: {
  locale: string;
  propertyId: string;
  block: BlockDto;
  t: ReturnType<typeof useTranslations>;
}) {
  const tCommon = useTranslations("common");
  const [state, action, pending] = useActionState(
    updateBlockAction.bind(null, locale, propertyId, block.id),
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteBlockAction.bind(null, locale, propertyId, block.id),
    initial,
  );
  const done = state.success || deleteState.success;

  return (
    <FormDrawer mode="edit" title={t("editBlock")} success={done}>
      <form action={action} className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor={`block-name-${block.id}`}>{t("blockName")}</Label>
          <Input id={`block-name-${block.id}`} name="name" defaultValue={block.name} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`sort-order-${block.id}`}>{t("sortOrder")}</Label>
          <Input
            id={`sort-order-${block.id}`}
            name="sortOrder"
            type="number"
            defaultValue={block.sortOrder}
          />
        </div>
        <ErrorText code={state.error} ns={t} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {t("saveChanges")}
        </Button>
      </form>
      <DeleteEntityForm
        confirmMessage={t("confirmDelete")}
        label={tCommon("delete")}
        error={deleteState.error}
        ns={t}
        action={deleteAction}
        pending={deletePending}
      />
    </FormDrawer>
  );
}

function UnitEditDrawer({
  locale,
  propertyId,
  unit,
  blocks,
  t,
}: {
  locale: string;
  propertyId: string;
  unit: UnitDto;
  blocks: BlockDto[];
  t: ReturnType<typeof useTranslations>;
}) {
  const tCommon = useTranslations("common");
  const [state, action, pending] = useActionState(
    updateUnitAction.bind(null, locale, propertyId, unit.id),
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUnitAction.bind(null, locale, propertyId, unit.id),
    initial,
  );
  const [blockId, setBlockId] = useState(unit.blockId ?? "");
  const done = state.success || deleteState.success;

  return (
    <FormDrawer mode="edit" title={t("editUnit")} success={done}>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="blockId" value={blockId} />
        <div className="grid gap-2">
          <Label htmlFor={`unit-code-${unit.id}`}>{t("unitCode")}</Label>
          <Input id={`unit-code-${unit.id}`} name="code" defaultValue={unit.code} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`unit-block-${unit.id}`}>{t("block")}</Label>
          <Select
            value={blockId || "__none__"}
            onValueChange={(v) => setBlockId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger id={`unit-block-${unit.id}`}>
              <SelectValue placeholder={t("noBlock")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("noBlock")}</SelectItem>
              {blocks.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`floor-${unit.id}`}>{t("floor")}</Label>
          <Input
            id={`floor-${unit.id}`}
            name="floor"
            type="number"
            defaultValue={unit.floor ?? undefined}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`area-${unit.id}`}>{t("areaM2")}</Label>
          <Input id={`area-${unit.id}`} name="areaM2" defaultValue={unit.areaM2 ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`share-${unit.id}`}>{t("shareRatio")}</Label>
          <Input id={`share-${unit.id}`} name="shareRatio" defaultValue={unit.shareRatio ?? ""} />
        </div>
        <ErrorText code={state.error} ns={t} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {t("saveChanges")}
        </Button>
      </form>
      <DeleteEntityForm
        confirmMessage={t("confirmDelete")}
        label={tCommon("delete")}
        error={deleteState.error}
        ns={t}
        action={deleteAction}
        pending={deletePending}
      />
    </FormDrawer>
  );
}

function PartyExcelImportDrawer({
  locale,
  propertyId,
  t,
}: {
  locale: string;
  propertyId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [state, action, pending] = useActionState(
    importPartiesExcelAction.bind(null, locale, propertyId),
    initial,
  );
  const importParts = state.info?.match(/^IMPORT_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)$/) ?? null;

  return (
    <FormDrawer triggerLabel={t("importPartiesExcel")} title={t("importPartiesExcel")} success={state.success}>
      <form action={action} className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("importPartiesExcelHint")}</p>
        <div className="grid gap-2">
          <Label htmlFor="parties-xlsx-file">{t("xlsxFile")}</Label>
          <Input
            id="parties-xlsx-file"
            name="xlsxFile"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">
            {t(`errors.${state.error}`, {
              sample: state.info ?? "",
              defaultMessage: state.error,
            })}
          </p>
        ) : null}
        {state.success && importParts ? (
          <p className="text-sm text-muted-foreground">
            {t("importResult", {
              created: importParts[1],
              updated: importParts[2],
              skipped: importParts[3],
              errors: importParts[4],
              removedMalformed: importParts[5],
            })}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {t("importSubmit")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function UnitExcelImportDrawer({
  locale,
  propertyId,
  t,
}: {
  locale: string;
  propertyId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [state, action, pending] = useActionState(
    importUnitsExcelAction.bind(null, locale, propertyId),
    initial,
  );
  const importParts = state.info?.match(/^IMPORT_(\d+)_(\d+)_(\d+)_(\d+)_(\d+)$/) ?? null;

  return (
    <FormDrawer triggerLabel={t("importUnitsExcel")} title={t("importUnitsExcel")} success={state.success}>
      <form action={action} className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("importUnitsExcelHint")}</p>
        <div className="grid gap-2">
          <Label htmlFor="xlsx-file">{t("xlsxFile")}</Label>
          <Input
            id="xlsx-file"
            name="xlsxFile"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">
            {t(`errors.${state.error}`, {
              sample: state.info ?? "",
              defaultMessage: state.error,
            })}
          </p>
        ) : null}
        {state.success && importParts ? (
          <p className="text-sm text-muted-foreground">
            {t("importResult", {
              created: importParts[1],
              updated: importParts[2],
              skipped: importParts[3],
              errors: importParts[4],
              removedMalformed: importParts[5],
            })}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {t("importSubmit")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function PartyEditDrawer({
  locale,
  propertyId,
  party,
  t,
}: {
  locale: string;
  propertyId: string;
  party: PartyDto;
  t: ReturnType<typeof useTranslations>;
}) {
  const tCommon = useTranslations("common");
  const [state, action, pending] = useActionState(
    updatePartyAction.bind(null, locale, propertyId, party.id),
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePartyAction.bind(null, locale, propertyId, party.id),
    initial,
  );
  const [partyType, setPartyType] = useState<PartyType>(party.type);
  const [communicationConsent, setCommunicationConsent] = useState(party.communicationConsent);
  const done = state.success || deleteState.success;

  return (
    <FormDrawer mode="edit" title={t("editParty")} success={done}>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="type" value={partyType} />
        <input type="hidden" name="communicationConsent" value={communicationConsent ? "on" : ""} />
        <div className="grid gap-2">
          <Label htmlFor={`party-type-${party.id}`}>{t("partyType")}</Label>
          <Select value={partyType} onValueChange={(v) => setPartyType(v as PartyType)}>
            <SelectTrigger id={`party-type-${party.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PartyType.PERSON}>{t("partyPerson")}</SelectItem>
              <SelectItem value={PartyType.COMPANY}>{t("partyCompany")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`display-name-${party.id}`}>{t("displayName")}</Label>
          <Input id={`display-name-${party.id}`} name="displayName" defaultValue={party.displayName} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`party-email-${party.id}`}>{t("email")}</Label>
          <Input
            id={`party-email-${party.id}`}
            name="email"
            type="email"
            defaultValue={party.email ?? ""}
            disabled={party.hasPortalAccess}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`party-phone-${party.id}`}>{t("phone")}</Label>
          <Input id={`party-phone-${party.id}`} name="phone" defaultValue={party.phone ?? ""} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`party-consent-${party.id}`}
            checked={communicationConsent}
            onCheckedChange={(v) => setCommunicationConsent(v === true)}
          />
          <Label htmlFor={`party-consent-${party.id}`} className="font-normal">
            {t("communicationConsent")}
          </Label>
        </div>
        <ErrorText code={state.error} ns={t} />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {t("saveChanges")}
        </Button>
      </form>
      <DeleteEntityForm
        confirmMessage={t("confirmDelete")}
        label={tCommon("delete")}
        error={deleteState.error}
        ns={t}
        action={deleteAction}
        pending={deletePending}
      />
    </FormDrawer>
  );
}
