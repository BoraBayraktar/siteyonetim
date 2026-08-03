"use client";

import type {
  ApprovedAuditorReportOptionDto,
  AssemblyDecisionDto,
  GeneralAssemblyMeetingDetailDto,
} from "@siteyonetim/property-governance";
import {
  AssemblyAttendanceMode,
  AssemblyDecisionOutcome,
  GeneralAssemblyMeetingType,
} from "@siteyonetim/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import {
  deleteDecisionAction,
  deleteMeetingAction,
  updateMeetingAction,
  upsertAttendanceAction,
  upsertDecisionAction,
  type GovernanceActionState,
} from "@/app/actions/governance";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale: string;
  propertyId: string;
  meeting: GeneralAssemblyMeetingDetailDto;
  approvedReports: ApprovedAuditorReportOptionDto[];
  readOnly?: boolean;
};

function toDateInput(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function GovernanceMeetingDetailPanel({
  locale,
  propertyId,
  meeting,
  approvedReports,
  readOnly = false,
}: Props) {
  const t = useTranslations("governance");
  const router = useRouter();
  const basePath = readOnly
    ? `/${locale}/auditor/properties/${propertyId}/governance`
    : `/${locale}/admin/properties/${propertyId}/governance`;

  const [meetingType, setMeetingType] = useState(meeting.meetingType);
  const [linkedReportId, setLinkedReportId] = useState(meeting.linkedReportId ?? "");

  const [updateState, updateAction, updatePending] = useActionState(
    updateMeetingAction.bind(null, locale, propertyId, meeting.id),
    {} as GovernanceActionState,
  );
  const [decisionOutcome, setDecisionOutcome] = useState<AssemblyDecisionOutcome>(
    AssemblyDecisionOutcome.NOT_VOTED,
  );
  const [decisionState, decisionAction, decisionPending] = useActionState(
    upsertDecisionAction.bind(null, locale, propertyId, meeting.id),
    {} as GovernanceActionState,
  );

  const hazirunHref = `/api/governance/hazirun?propertyId=${propertyId}&meetingId=${meeting.id}&locale=${locale}`;

  async function handleDeleteMeeting() {
    if (readOnly) return;
    await deleteMeetingAction(locale, propertyId, meeting.id);
    router.push(basePath);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="px-0">
          <Link href={basePath}>← {t("backToList")}</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={hazirunHref}>{t("exportHazirun")}</Link>
          </Button>
          {!readOnly ? (
            <Button variant="destructive" size="sm" onClick={handleDeleteMeeting}>
              {t("deleteMeeting")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("meetingInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          {readOnly ? (
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("meetingType")}</dt>
                <dd className="font-medium">{t(`type.${meeting.meetingType}`)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("meetingDate")}</dt>
                <dd className="font-medium">{toDateInput(meeting.meetingDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("location")}</dt>
                <dd className="font-medium">{meeting.location ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("noticeSentAt")}</dt>
                <dd className="font-medium">{toDateInput(meeting.noticeSentAt) || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("noticeMethod")}</dt>
                <dd className="font-medium">{meeting.noticeMethod ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("linkedReport")}</dt>
                <dd className="font-medium">{meeting.linkedReportLabel ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">{t("agendaSummary")}</dt>
                <dd className="font-medium whitespace-pre-wrap">{meeting.agendaSummary ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <form action={updateAction} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("meetingType")}</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as GeneralAssemblyMeetingType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GeneralAssemblyMeetingType.ORDINARY}>{t("type.ORDINARY")}</SelectItem>
                    <SelectItem value={GeneralAssemblyMeetingType.EXTRAORDINARY}>
                      {t("type.EXTRAORDINARY")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="meetingType" value={meetingType} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="detail-date">{t("meetingDate")}</Label>
                <Input
                  id="detail-date"
                  name="meetingDate"
                  type="date"
                  defaultValue={toDateInput(meeting.meetingDate)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="detail-location">{t("location")}</Label>
                <Input id="detail-location" name="location" defaultValue={meeting.location ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="detail-notice-date">{t("noticeSentAt")}</Label>
                <Input
                  id="detail-notice-date"
                  name="noticeSentAt"
                  type="date"
                  defaultValue={toDateInput(meeting.noticeSentAt)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="detail-notice-method">{t("noticeMethod")}</Label>
                <Input
                  id="detail-notice-method"
                  name="noticeMethod"
                  defaultValue={meeting.noticeMethod ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("linkedReport")}</Label>
                <Select value={linkedReportId} onValueChange={setLinkedReportId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("linkedReportNone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("linkedReportNone")}</SelectItem>
                    {approvedReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.year} {report.period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="linkedReportId" value={linkedReportId} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="detail-agenda">{t("agendaSummary")}</Label>
                <Textarea
                  id="detail-agenda"
                  name="agendaSummary"
                  rows={3}
                  defaultValue={meeting.agendaSummary ?? ""}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={updatePending}>
                  {t("saveMeeting")}
                </Button>
              </div>
            </form>
          )}
          {updateState.success ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("meetingSaved")}</p>
          ) : null}
          {updateState.error ? (
            <p className="mt-3 text-sm text-destructive">{t(`errors.${updateState.error}` as "errors.UNAUTHORIZED")}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("decisionsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly ? (
            <form action={decisionAction} className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="decision-subject">{t("decisionSubject")}</Label>
                <Textarea id="decision-subject" name="subject" rows={2} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decision-outcome">{t("decisionOutcome")}</Label>
                <Select
                  value={decisionOutcome}
                  onValueChange={(v) => setDecisionOutcome(v as AssemblyDecisionOutcome)}
                >
                  <SelectTrigger id="decision-outcome">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssemblyDecisionOutcome).map((outcome) => (
                      <SelectItem key={outcome} value={outcome}>
                        {t(`outcome.${outcome}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="outcome" value={decisionOutcome} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decision-for">{t("voteFor")}</Label>
                <Input id="decision-for" name="voteFor" type="number" min={0} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decision-against">{t("voteAgainst")}</Label>
                <Input id="decision-against" name="voteAgainst" type="number" min={0} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decision-abstain">{t("voteAbstain")}</Label>
                <Input id="decision-abstain" name="voteAbstain" type="number" min={0} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={decisionPending}>
                  {t("addDecision")}
                </Button>
              </div>
            </form>
          ) : null}
          {decisionState.success ? (
            <p className="text-sm text-muted-foreground">{t("decisionSaved")}</p>
          ) : null}
          {meeting.decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("decisionsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("decisionSubject")}</TableHead>
                  <TableHead>{t("decisionOutcome")}</TableHead>
                  <TableHead>{t("voteFor")}</TableHead>
                  <TableHead>{t("voteAgainst")}</TableHead>
                  <TableHead>{t("voteAbstain")}</TableHead>
                  {!readOnly ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {meeting.decisions.map((decision: AssemblyDecisionDto) => (
                  <TableRow key={decision.id}>
                    <TableCell>{decision.subject}</TableCell>
                    <TableCell>{t(`outcome.${decision.outcome}`)}</TableCell>
                    <TableCell>{decision.voteFor ?? "—"}</TableCell>
                    <TableCell>{decision.voteAgainst ?? "—"}</TableCell>
                    <TableCell>{decision.voteAbstain ?? "—"}</TableCell>
                    {!readOnly ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDecisionAction(locale, propertyId, meeting.id, decision.id)}
                        >
                          {t("deleteDecision")}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("attendanceTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("attendanceSummary", {
              present: meeting.presentCount,
              total: meeting.attendanceCount,
            })}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("unit")}</TableHead>
                <TableHead>{t("block")}</TableHead>
                <TableHead>{t("owner")}</TableHead>
                <TableHead>{t("attendanceMode")}</TableHead>
                <TableHead>{t("proxyHolder")}</TableHead>
                {!readOnly ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {meeting.attendances.map((row) => (
                <AttendanceRow
                  key={row.id}
                  locale={locale}
                  propertyId={propertyId}
                  meetingId={meeting.id}
                  row={row}
                  readOnly={readOnly}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceRow({
  locale,
  propertyId,
  meetingId,
  row,
  readOnly,
}: {
  locale: string;
  propertyId: string;
  meetingId: string;
  row: GeneralAssemblyMeetingDetailDto["attendances"][number];
  readOnly: boolean;
}) {
  const t = useTranslations("governance");
  const [mode, setMode] = useState<AssemblyAttendanceMode>(row.mode);
  const [proxyHolder, setProxyHolder] = useState(row.proxyHolder ?? "");
  const [, attendanceAction] = useActionState(
    upsertAttendanceAction.bind(null, locale, propertyId, meetingId),
    {} as GovernanceActionState,
  );

  if (readOnly) {
    return (
      <TableRow>
        <TableCell>{row.unitCode}</TableCell>
        <TableCell>{row.blockName ?? "—"}</TableCell>
        <TableCell>{row.ownerName ?? "—"}</TableCell>
        <TableCell>{t(`attendance.${row.mode}`)}</TableCell>
        <TableCell>{row.proxyHolder ?? "—"}</TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{row.unitCode}</TableCell>
      <TableCell>{row.blockName ?? "—"}</TableCell>
      <TableCell>{row.ownerName ?? "—"}</TableCell>
      <TableCell>
        <Select value={mode} onValueChange={(v) => setMode(v as AssemblyAttendanceMode)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(AssemblyAttendanceMode).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`attendance.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          value={proxyHolder}
          onChange={(e) => setProxyHolder(e.target.value)}
          disabled={mode !== AssemblyAttendanceMode.PROXY}
        />
      </TableCell>
      <TableCell>
        <form action={attendanceAction}>
          <input type="hidden" name="unitId" value={row.unitId} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="proxyHolder" value={proxyHolder} />
          <Button type="submit" variant="outline" size="sm">
            {t("saveAttendance")}
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}
