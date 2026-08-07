"use client";

import type { ApprovedAuditorReportSummaryDto } from "@siteyonetim/reporting-auditor";
import type { GeneralAssemblyMeetingSummaryDto } from "@siteyonetim/property-governance";
import { GeneralAssemblyMeetingType } from "@siteyonetim/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import { createMeetingAction, type GovernanceActionState } from "@/app/actions/governance";
import { FormDrawer } from "@/components/form-drawer";
import { ServerPagination } from "@/components/server-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  locale: string;
  propertyId: string;
  items: GeneralAssemblyMeetingSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
  approvedReports: ApprovedAuditorReportSummaryDto[];
  readOnly?: boolean;
};

const initial: GovernanceActionState = {};

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
  });
}

export function GovernanceMeetingsPanel({
  locale,
  propertyId,
  items,
  page,
  pageSize,
  total,
  approvedReports,
  readOnly = false,
}: Props) {
  const t = useTranslations("governance");
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createMeetingAction.bind(null, locale, propertyId),
    initial,
  );

  const [meetingType, setMeetingType] = useState<GeneralAssemblyMeetingType>(
    GeneralAssemblyMeetingType.ORDINARY,
  );
  const [linkedReportId, setLinkedReportId] = useState("");

  useEffect(() => {
    if (state.success && state.meetingId) {
      router.push(`/${locale}/admin/properties/${propertyId}/governance/${state.meetingId}`);
    }
  }, [state.success, state.meetingId, locale, propertyId, router]);

  const basePath =
    readOnly
      ? `/${locale}/auditor/properties/${propertyId}/governance`
      : `/${locale}/admin/properties/${propertyId}/governance`;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("meetingsTitle")}</CardTitle>
        {!readOnly ? (
          <FormDrawer triggerLabel={t("createMeeting")} title={t("createMeeting")} success={state.success}>
            <form action={action} className="grid gap-4">
              <input type="hidden" name="meetingType" value={meetingType} />
              <input type="hidden" name="linkedReportId" value={linkedReportId} />
              <div className="grid gap-2">
                <Label htmlFor="gov-meeting-date">{t("fieldMeetingDate")}</Label>
                <Input id="gov-meeting-date" name="meetingDate" type="datetime-local" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gov-meeting-type">{t("fieldMeetingType")}</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as GeneralAssemblyMeetingType)}>
                  <SelectTrigger id="gov-meeting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GeneralAssemblyMeetingType.ORDINARY}>
                      {t("meetingType.ORDINARY")}
                    </SelectItem>
                    <SelectItem value={GeneralAssemblyMeetingType.EXTRAORDINARY}>
                      {t("meetingType.EXTRAORDINARY")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gov-title">{t("fieldTitle")}</Label>
                <Input id="gov-title" name="title" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gov-linked-report">{t("fieldLinkedReport")}</Label>
                <Select value={linkedReportId} onValueChange={setLinkedReportId}>
                  <SelectTrigger id="gov-linked-report">
                    <SelectValue placeholder={t("linkedReportPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("linkedReportNone")}</SelectItem>
                    {approvedReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.year} — {report.period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {state.error ? (
                <p className="text-sm text-destructive">{t(`errors.${state.error}` as "errors.UNAUTHORIZED")}</p>
              ) : null}
              <Button type="submit" disabled={pending}>
                {t("saveMeeting")}
              </Button>
            </form>
          </FormDrawer>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("meetingsEmpty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fieldMeetingDate")}</TableHead>
                <TableHead>{t("fieldMeetingType")}</TableHead>
                <TableHead>{t("fieldTitle")}</TableHead>
                <TableHead>{t("decisionCount")}</TableHead>
                <TableHead>{t("attendanceCount")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.meetingDate, locale)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`meetingType.${row.meetingType}`)}</Badge>
                  </TableCell>
                  <TableCell>{row.title ?? "—"}</TableCell>
                  <TableCell>{row.decisionCount}</TableCell>
                  <TableCell>{row.attendanceCount}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${basePath}/${row.id}`}>{t("openMeeting")}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ServerPagination locale={locale} basePath={basePath} page={page} pageSize={pageSize} total={total} />
      </CardContent>
    </Card>
  );
}
