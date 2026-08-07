"use client";

import type { PropertyPortalSettingsDto, PropertyTenantDto } from "@siteyonetim/platform-tenant";
import type { UnitDto } from "@siteyonetim/property-core";
import { PortalAuthMode, PropertyIsolationMode } from "@siteyonetim/db";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  setUnitPortalPasswordAction,
  updatePortalAuthModeAction,
  updatePortalSettingsAction,
  updateTenantIsolationAction,
  type TenantActionState,
} from "@/app/actions/property-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  locale: string;
  propertyId: string;
  tenant: PropertyTenantDto;
  portalSettings: PropertyPortalSettingsDto;
  units: UnitDto[];
  canMutate: boolean;
  showDatabaseIsolation: boolean;
};

function unitOptionLabel(unit: UnitDto): string {
  return unit.blockName ? `${unit.blockName} / ${unit.code}` : unit.code;
}

const initial: TenantActionState = {};

function ErrorText({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}`, { defaultMessage: code })}</p>;
}

function PortalSettingsForm({
  locale,
  propertyId,
  portalSettings,
  canMutate,
}: {
  locale: string;
  propertyId: string;
  portalSettings: PropertyPortalSettingsDto;
  canMutate: boolean;
}) {
  const t = useTranslations("propertyTenant");
  const router = useRouter();
  const [state, action, pending] = useActionState(updatePortalSettingsAction, initial);
  const [showStatement, setShowStatement] = useState(portalSettings.showStatement);
  const [showAnnouncements, setShowAnnouncements] = useState(portalSettings.showAnnouncements);
  const [showDocuments, setShowDocuments] = useState(portalSettings.showDocuments);
  const [showIncomeExpenseReport, setShowIncomeExpenseReport] = useState(
    portalSettings.showIncomeExpenseReport,
  );
  const [showMemberDebtSummary, setShowMemberDebtSummary] = useState(portalSettings.showMemberDebtSummary);
  const [showIncidents, setShowIncidents] = useState(portalSettings.showIncidents);

  useEffect(() => {
    setShowStatement(portalSettings.showStatement);
    setShowAnnouncements(portalSettings.showAnnouncements);
    setShowDocuments(portalSettings.showDocuments);
    setShowIncomeExpenseReport(portalSettings.showIncomeExpenseReport);
    setShowMemberDebtSummary(portalSettings.showMemberDebtSummary);
    setShowIncidents(portalSettings.showIncidents);
  }, [portalSettings]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="showStatement" value={showStatement ? "on" : "off"} />
      <input type="hidden" name="showAnnouncements" value={showAnnouncements ? "on" : "off"} />
      <input type="hidden" name="showDocuments" value={showDocuments ? "on" : "off"} />
      <input type="hidden" name="showIncomeExpenseReport" value={showIncomeExpenseReport ? "on" : "off"} />
      <input type="hidden" name="showMemberDebtSummary" value={showMemberDebtSummary ? "on" : "off"} />
      <input type="hidden" name="showIncidents" value={showIncidents ? "on" : "off"} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showStatement}
          onCheckedChange={(value) => setShowStatement(value === true)}
          disabled={!canMutate}
        />
        {t("showStatement")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showAnnouncements}
          onCheckedChange={(value) => setShowAnnouncements(value === true)}
          disabled={!canMutate}
        />
        {t("showAnnouncements")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showDocuments}
          onCheckedChange={(value) => setShowDocuments(value === true)}
          disabled={!canMutate}
        />
        {t("showDocuments")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showIncomeExpenseReport}
          onCheckedChange={(value) => setShowIncomeExpenseReport(value === true)}
          disabled={!canMutate}
        />
        {t("showIncomeExpenseReport")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showMemberDebtSummary}
          onCheckedChange={(value) => setShowMemberDebtSummary(value === true)}
          disabled={!canMutate}
        />
        {t("showMemberDebtSummary")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showIncidents}
          onCheckedChange={(value) => setShowIncidents(value === true)}
          disabled={!canMutate}
        />
        {t("showIncidents")}
      </label>
      {canMutate ? (
        <Button type="submit" size="sm" disabled={pending}>
          {t("saveSettings")}
        </Button>
      ) : null}
      {state.success ? <p className="text-sm text-green-600">{t("saved")}</p> : null}
    </form>
  );
}

function PortalAuthModeForm({
  locale,
  propertyId,
  portalAuthMode,
  canMutate,
}: {
  locale: string;
  propertyId: string;
  portalAuthMode: PortalAuthMode;
  canMutate: boolean;
}) {
  const t = useTranslations("propertyTenant");
  const router = useRouter();
  const [state, action, pending] = useActionState(updatePortalAuthModeAction, initial);
  const [mode, setMode] = useState(portalAuthMode);

  useEffect(() => {
    setMode(portalAuthMode);
  }, [portalAuthMode]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  if (!canMutate) {
    return (
      <p className="text-sm">{t(`portalAuth.${portalAuthMode}`)}</p>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="portalAuthMode" value={mode} />
      <div className="grid gap-2">
        <Label htmlFor="portalAuthMode">{t("portalAuthMode")}</Label>
        <Select value={mode} onValueChange={(value) => setMode(value as PortalAuthMode)}>
          <SelectTrigger id="portalAuthMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PortalAuthMode.EMAIL}>{t("portalAuth.EMAIL")}</SelectItem>
            <SelectItem value={PortalAuthMode.UNIT_CREDENTIAL}>{t("portalAuth.UNIT_CREDENTIAL")}</SelectItem>
            <SelectItem value={PortalAuthMode.BOTH}>{t("portalAuth.BOTH")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {t("savePortalAuth")}
      </Button>
      {state.success ? <p className="text-sm text-green-600">{t("saved")}</p> : null}
      <ErrorText code={state.error} t={t} />
    </form>
  );
}

function TenantIsolationForm({
  locale,
  propertyId,
  tenant,
}: {
  locale: string;
  propertyId: string;
  tenant: PropertyTenantDto;
}) {
  const t = useTranslations("propertyTenant");
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTenantIsolationAction, initial);
  const [isolationMode, setIsolationMode] = useState(tenant.isolationMode);

  useEffect(() => {
    setIsolationMode(tenant.isolationMode);
  }, [tenant.isolationMode]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="isolationMode" value={isolationMode} />
      <div className="grid gap-2">
        <Label htmlFor="isolationMode">{t("isolationMode")}</Label>
        <Select value={isolationMode} onValueChange={(value) => setIsolationMode(value as PropertyIsolationMode)}>
          <SelectTrigger id="isolationMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PropertyIsolationMode.SHARED_SCHEMA}>
              {t("isolation.SHARED_SCHEMA")}
            </SelectItem>
            <SelectItem value={PropertyIsolationMode.DEDICATED_DATABASE}>
              {t("isolation.DEDICATED_DATABASE")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="neonProjectId">{t("neonProjectId")}</Label>
        <Input id="neonProjectId" name="neonProjectId" defaultValue={tenant.neonProjectId ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="neonBranchId">{t("neonBranchId")}</Label>
        <Input id="neonBranchId" name="neonBranchId" defaultValue={tenant.neonBranchId ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="databaseUrlSecretKey">{t("databaseUrlSecretKey")}</Label>
        <Input
          id="databaseUrlSecretKey"
          name="databaseUrlSecretKey"
          defaultValue={tenant.databaseUrlSecretKey ?? ""}
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {t("saveIsolation")}
      </Button>
      {state.success ? <p className="text-sm text-green-600">{t("saved")}</p> : null}
      <ErrorText code={state.error} t={t} />
    </form>
  );
}

export function PropertyTenantPanel({
  locale,
  propertyId,
  tenant,
  portalSettings,
  units,
  canMutate,
  showDatabaseIsolation,
}: Props) {
  const t = useTranslations("propertyTenant");
  const [credentialState, credentialAction, credentialPending] = useActionState(setUnitPortalPasswordAction, initial);
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id ?? "");

  useEffect(() => {
    if (units.length === 0) {
      setSelectedUnitId("");
      return;
    }
    if (!units.some((unit) => unit.id === selectedUnitId)) {
      setSelectedUnitId(units[0]!.id);
    }
  }, [units, selectedUnitId]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("tenantTitle")}</CardTitle>
          <CardDescription>{t("tenantSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("portalCode")}</p>
            <p className="font-mono font-medium">{tenant.portalCode}</p>
          </div>
          {showDatabaseIsolation ? (
            <div>
              <p className="text-muted-foreground">{t("isolationMode")}</p>
              <p>{t(`isolation.${tenant.isolationMode}`)}</p>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground">{t("isolationMode")}</p>
              <p>{t("isolationPilotDefault")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("portalSettingsTitle")}</CardTitle>
          <CardDescription>{t("portalSettingsSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PortalSettingsForm
            locale={locale}
            propertyId={propertyId}
            portalSettings={portalSettings}
            canMutate={canMutate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("portalAuthTitle")}</CardTitle>
          <CardDescription>{t("portalAuthSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PortalAuthModeForm
            locale={locale}
            propertyId={propertyId}
            portalAuthMode={tenant.portalAuthMode}
            canMutate={canMutate}
          />
        </CardContent>
      </Card>

      {canMutate ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("unitCredentialTitle")}</CardTitle>
            <CardDescription>{t("unitCredentialSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={credentialAction} className="grid gap-3">
              <input type="hidden" name="propertyId" value={propertyId} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="unitId" value={selectedUnitId} />
              <div className="grid gap-2">
                <Label htmlFor="unitSelect">{t("unitSelect")}</Label>
                {units.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("unitSelectEmpty")}</p>
                ) : (
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger id="unitSelect">
                      <SelectValue placeholder={t("unitSelect")} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unitOptionLabel(unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t("unitPassword")}</Label>
                <Input id="password" name="password" type="password" required autoComplete="new-password" />
              </div>
              <Button type="submit" size="sm" disabled={credentialPending || units.length === 0 || !selectedUnitId}>
                {t("setUnitPassword")}
              </Button>
              {credentialState.success ? <p className="text-sm text-green-600">{t("saved")}</p> : null}
              <ErrorText code={credentialState.error} t={t} />
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showDatabaseIsolation ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("isolationTitle")}</CardTitle>
            <CardDescription>{t("isolationSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TenantIsolationForm locale={locale} propertyId={propertyId} tenant={tenant} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
