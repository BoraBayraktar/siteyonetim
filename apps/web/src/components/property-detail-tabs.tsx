"use client";

import { OccupancyRole, PartyType } from "@siteyonetim/db";
import type { BlockDto, UnitDto } from "@siteyonetim/property-core";
import type { PartyDto } from "@siteyonetim/property-parties";
import type { OccupancyDto } from "@siteyonetim/property-occupancy";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  assignOccupancyAction,
  createBlockAction,
  createPartyAction,
  createUnitAction,
  invitePortalAction,
  type ActionState,
} from "@/app/actions/property-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OccupancyRow = OccupancyDto;

type Props = {
  locale: string;
  propertyId: string;
  blocks: BlockDto[];
  units: UnitDto[];
  parties: PartyDto[];
  occupancies: OccupancyRow[];
  unitOptions: UnitDto[];
  partyOptions: PartyDto[];
};

const initial: ActionState = {};

function ErrorText({ code, ns }: { code?: string; ns: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{ns(`errors.${code}`, { defaultMessage: code })}</p>;
}

export function PropertyDetailTabs({
  locale,
  propertyId,
  blocks,
  units,
  parties,
  occupancies,
  unitOptions,
  partyOptions,
}: Props) {
  const t = useTranslations("propertyDetail");
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
  const [assignState, assignAction, assignPending] = useActionState(
    assignOccupancyAction.bind(null, locale, propertyId),
    initial,
  );

  return (
    <Tabs defaultValue="blocks" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="blocks">{t("tabBlocks")}</TabsTrigger>
        <TabsTrigger value="units">{t("tabUnits")}</TabsTrigger>
        <TabsTrigger value="parties">{t("tabParties")}</TabsTrigger>
        <TabsTrigger value="occupancy">{t("tabOccupancy")}</TabsTrigger>
      </TabsList>

      <TabsContent value="blocks" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("tabBlocks")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ul className="space-y-2 text-sm">
              {blocks.map((b) => (
                <li key={b.id} className="flex justify-between border-b pb-2">
                  <span>{b.name}</span>
                  <span className="text-muted-foreground">{b.unitCount}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("addBlock")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={blockAction} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="block-name">{t("blockName")}</Label>
                <Input id="block-name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sort-order">{t("sortOrder")}</Label>
                <Input id="sort-order" name="sortOrder" type="number" defaultValue={0} />
              </div>
              <ErrorText code={blockState.error} ns={t} />
              {blockState.success ? <p className="text-sm text-muted-foreground">{t("blockSuccess")}</p> : null}
              <Button type="submit" disabled={blockPending}>
                {t("addBlock")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="units" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("tabUnits")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ul className="space-y-2 text-sm">
              {units.map((u) => (
                <li key={u.id} className="border-b pb-2">
                  <span className="font-medium">{u.code}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {u.blockName ?? t("noBlock")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <UnitCreateForm
          t={t}
          blocks={blocks}
          state={unitState}
          action={unitAction}
          pending={unitPending}
        />
      </TabsContent>

      <TabsContent value="parties" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("tabParties")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {parties.map((p) => (
                <li key={p.id} className="border-b pb-2">
                  <div className="font-medium">{p.displayName}</div>
                  <div className="text-muted-foreground">
                    {t("hasPortal")}: {p.hasPortalAccess ? t("yes") : t("no")}
                  </div>
                </li>
              ))}
            </ul>
            <PartyInviteForm
              t={t}
              parties={partyOptions.filter((p) => !p.hasPortalAccess)}
              state={inviteState}
              action={inviteAction}
              pending={invitePending}
            />
          </CardContent>
        </Card>
        <PartyCreateForm t={t} state={partyState} action={partyAction} pending={partyPending} />
      </TabsContent>

      <TabsContent value="occupancy" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("occupancyList")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {occupancies.map((o) => (
                <li key={o.id} className="border-b pb-2">
                  {o.unitCode} — {o.partyName} (
                  {o.role === OccupancyRole.OWNER ? t("roleOwner") : t("roleTenant")})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <AssignOccupancyForm
          t={t}
          units={unitOptions}
          parties={partyOptions}
          state={assignState}
          action={assignAction}
          pending={assignPending}
        />
      </TabsContent>
    </Tabs>
  );
}

function UnitCreateForm({
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
    <Card>
      <CardHeader>
        <CardTitle>{t("addUnit")}</CardTitle>
      </CardHeader>
      <CardContent>
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
          {state.success ? <p className="text-sm text-muted-foreground">{t("unitSuccess")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("addUnit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PartyCreateForm({
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("addParty")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="type" value={partyType} />
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
          <ErrorText code={state.error} ns={t} />
          {state.success ? <p className="text-sm text-muted-foreground">{t("partySuccess")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("addParty")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PartyInviteForm({
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
    <Card>
      <CardHeader>
        <CardTitle>{t("portalInvite")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="partyId" value={partyId} />
          <div className="grid gap-2">
            <Label htmlFor="invite-party">{t("displayName")}</Label>
            <Select value={partyId} onValueChange={setPartyId} required>
              <SelectTrigger id="invite-party">
                <SelectValue placeholder="…" />
              </SelectTrigger>
              <SelectContent>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {state.success ? <p className="text-sm text-muted-foreground">{t("inviteSuccess")}</p> : null}
          <Button type="submit" disabled={pending || parties.length === 0}>
            {t("inviteSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AssignOccupancyForm({
  t,
  units,
  parties,
  state,
  action,
  pending,
}: {
  t: ReturnType<typeof useTranslations>;
  units: UnitDto[];
  parties: PartyDto[];
  state: ActionState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [partyId, setPartyId] = useState(parties[0]?.id ?? "");
  const [role, setRole] = useState<OccupancyRole>(OccupancyRole.OWNER);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("assignOccupancy")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="unitId" value={unitId} />
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="role" value={role} />
          <div className="grid gap-2">
            <Label htmlFor="occ-unit">{t("unitCode")}</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger id="occ-unit">
                <SelectValue placeholder="…" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="occ-party">{t("displayName")}</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger id="occ-party">
                <SelectValue placeholder="…" />
              </SelectTrigger>
              <SelectContent>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="occ-role">{t("role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OccupancyRole)}>
              <SelectTrigger id="occ-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OccupancyRole.OWNER}>{t("roleOwner")}</SelectItem>
                <SelectItem value={OccupancyRole.TENANT}>{t("roleTenant")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ErrorText code={state.error} ns={t} />
          {state.success ? <p className="text-sm text-muted-foreground">{t("assignSuccess")}</p> : null}
          <Button type="submit" disabled={pending || units.length === 0 || parties.length === 0}>
            {t("assignSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
