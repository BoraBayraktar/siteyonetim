"use client";

import {
  AssemblyAttendanceKind,
  AssemblyNoticeMethod,
  GeneralAssemblyMeetingType,
} from "@siteyonetim/db";
import type { ApprovedAuditorReportSummaryDto } from "@siteyonetim/reporting-auditor";
import type { GeneralAssemblyMeetingDetailDto } from "@siteyonetim/property-governance";
import type { UnitDto } from "@siteyonetim/property-core";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

import {
  addDecisionAction,
  deleteDecisionFormAction,
  deleteMeetingFormAction,
  updateMeetingAction,
  upsertAttendanceAction,
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
  units: UnitDto[];
  approvedReports: ApprovedAuditorReportSummaryDto[];
  readOnly?: boolean;
  backHref: string;
};

const initial: GovernanceActionState = {};

function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function GovernanceMeetingDetailPanel({
  locale,
  propertyId,
  meeting,
  units,
  approvedReports,
  readOnly = false,
  backHref,
}: Props) {
  const t = useTranslations("governance");
  const tCommon = useTranslations("common");

  const [meetingType, setMeetingType] = useState(meeting.meetingType);
  const [linkedReportId, setLinkedReportId] = useState(meeting.linkedReportId ?? "");
  const [noticeMethod, setNoticeMethod] = useState(meeting.noticeMethod ?? "");

  const [updateState, updateAction, updatePending] = useActionState(
    updateMeetingAction.bind(null, locale, propertyId, meeting.id),
    initial,
  );
  const [decisionState, decisionAction, decisionPending] = useActionState(
    addDecisionAction.bind(null, locale, propertyId, meeting.id),
    initial,
  );

  const attendanceByUnit = useMemo(() => {
    return new Map(meeting.attendances.map((row) => [row.unitId, row]));
  }, [meeting.attendances]);

  const hazirunHref = `/api/governance/hazirun?propertyId=${encodeURIComponent(propertyId)}&meetingId=${encodeURIComponent(meeting.id)}&locale=${encodeURIComponent(locale)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="px-0">
          <Link href={backHref}>← {tCommon("back")}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={hazirunHref}>{t("downloadHazirun")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("meetingDetailTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {readOnly ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailItem label={t("fieldMeetingDate")} value={formatDate(meeting.meetingDate, locale)} />
              <DetailItem label={t("fieldMeetingType")} value={t(`meetingType.${meeting.meetingType}`)} />
              <DetailItem label={t("fieldTitle")} value={meeting.title ?? "—"} />
              <DetailItem label={t("fieldLinkedReport")} value={meeting.linkedReportLabel ?? "—"} />
              <DetailItem
                label={t("fieldNoticeSentAt")}
                value={meeting.noticeSentAt ? formatDate(meeting.noticeSentAt, locale) : "—"}
              />
              <DetailItem
                label={t("fieldNoticeMethod")}
                value={meeting.noticeMethod ? t(`noticeMethod.${meeting.noticeMethod}`) : "—"}
              />
              <DetailItem label={t("fieldNotes")} value={meeting.notes ?? "—"} className="sm:col-span-2" />
            </dl>
          ) : (
            <form action={updateAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="meetingType" value={meetingType} />
              <input type="hidden" name="linkedReportId" value={linkedReportId} />
              <input type="hidden" name="noticeMethod" value={noticeMethod} />
              <div className="grid gap-2">
                <Label htmlFor="meeting-date">{t("fieldMeetingDate")}</Label>
                <Input
                  id="meeting-date"
                  name="meetingDate"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(meeting.meetingDate)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meeting-type">{t("fieldMeetingType")}</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as GeneralAssemblyMeetingType)}>
                  <SelectTrigger id="meeting-type">
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
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="meeting-title">{t("fieldTitle")}</Label>
                <Input id="meeting-title" name="title" defaultValue={meeting.title ?? ""} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="linked-report">{t("fieldLinkedReport")}</Label>
                <Select value={linkedReportId} onValueChange={setLinkedReportId}>
                  <SelectTrigger id="linked-report">
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
              <div className="grid gap-2">
                <Label htmlFor="notice-sent">{t("fieldNoticeSentAt")}</Label>
                <Input
                  id="notice-sent"
                  name="noticeSentAt"
                  type="date"
                  defaultValue={toDateInputValue(meeting.noticeSentAt)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notice-method">{t("fieldNoticeMethod")}</Label>
                <Select value={noticeMethod} onValueChange={setNoticeMethod}>
                  <SelectTrigger id="notice-method">
                    <SelectValue placeholder={t("noticeMethodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("linkedReportNone")}</SelectItem>
                    {Object.values(AssemblyNoticeMethod).map((method) => (
                      <SelectItem key={method} value={method}>
                        {t(`noticeMethod.${method}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="meeting-notes">{t("fieldNotes")}</Label>
                <Textarea id="meeting-notes" name="notes" defaultValue={meeting.notes ?? ""} rows={3} />
              </div>
              {updateState.error ? (
                <p className="text-sm text-destructive sm:col-span-2">
                  {t(`errors.${updateState.error}` as "errors.UNAUTHORIZED")}
                </p>
              ) : null}
              {updateState.success ? (
                <p className="text-sm text-muted-foreground sm:col-span-2">{t("meetingSaved")}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={updatePending}>
                  {t("saveMeeting")}
                </Button>
                <DeleteMeetingButton
                  locale={locale}
                  propertyId={propertyId}
                  meetingId={meeting.id}
                  backHref={backHref}
                />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("decisionsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meeting.decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("decisionsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fieldDecisionTopic")}</TableHead>
                  <TableHead>{t("fieldDecisionOutcome")}</TableHead>
                  {!readOnly ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {meeting.decisions.map((decision) => (
                  <TableRow key={decision.id}>
                    <TableCell>{decision.topic}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{decision.outcome}</TableCell>
                    {!readOnly ? (
                      <TableCell>
                        <form action={deleteDecisionFormAction.bind(null, locale, propertyId, meeting.id, decision.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            {tCommon("delete")}
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!readOnly ? (
            <form action={decisionAction} className="grid gap-3 border-t pt-4">
              <div className="grid gap-2">
                <Label htmlFor="decision-topic">{t("fieldDecisionTopic")}</Label>
                <Input id="decision-topic" name="topic" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decision-outcome">{t("fieldDecisionOutcome")}</Label>
                <Textarea id="decision-outcome" name="outcome" required rows={3} />
              </div>
              {decisionState.error ? (
                <p className="text-sm text-destructive">
                  {t(`errors.${decisionState.error}` as "errors.UNAUTHORIZED")}
                </p>
              ) : null}
              <Button type="submit" disabled={decisionPending}>
                {t("addDecision")}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("attendanceTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t("attendanceHint")}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fieldUnit")}</TableHead>
                <TableHead>{t("fieldBlock")}</TableHead>
                <TableHead>{t("fieldParty")}</TableHead>
                <TableHead>{t("fieldAttendanceKind")}</TableHead>
                <TableHead>{t("fieldProxyHolder")}</TableHead>
                {!readOnly ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => {
                const saved = attendanceByUnit.get(unit.id);
                return readOnly ? (
                  <TableRow key={unit.id}>
                    <TableCell>{unit.code}</TableCell>
                    <TableCell>{saved?.blockName ?? unit.blockName ?? "—"}</TableCell>
                    <TableCell>{saved?.partyName ?? "—"}</TableCell>
                    <TableCell>
                      {t(`attendanceKind.${saved?.attendanceKind ?? AssemblyAttendanceKind.ABSENT}`)}
                    </TableCell>
                    <TableCell>{saved?.proxyHolderName ?? "—"}</TableCell>
                  </TableRow>
                ) : (
                  <AttendanceRow
                    key={unit.id}
                    locale={locale}
                    propertyId={propertyId}
                    meetingId={meeting.id}
                    unitId={unit.id}
                    unitCode={unit.code}
                    blockName={unit.blockName ?? "—"}
                    saved={saved}
                  />
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function DeleteMeetingButton({
  locale,
  propertyId,
  meetingId,
  backHref,
}: {
  locale: string;
  propertyId: string;
  meetingId: string;
  backHref: string;
}) {
  const t = useTranslations("governance");
  const tCommon = useTranslations("common");

  return (
    <form action={deleteMeetingFormAction.bind(null, locale, propertyId, meetingId, backHref)}>
      <Button
        type="submit"
        variant="destructive"
        onClick={(event) => {
          if (!window.confirm(t("deleteMeetingConfirm"))) {
            event.preventDefault();
          }
        }}
      >
        {tCommon("delete")}
      </Button>
    </form>
  );
}

function AttendanceRow({
  locale,
  propertyId,
  meetingId,
  unitId,
  unitCode,
  blockName,
  saved,
}: {
  locale: string;
  propertyId: string;
  meetingId: string;
  unitId: string;
  unitCode: string;
  blockName: string;
  saved?: GeneralAssemblyMeetingDetailDto["attendances"][number];
}) {
  const t = useTranslations("governance");
  const [attendanceKind, setAttendanceKind] = useState(
    saved?.attendanceKind ?? AssemblyAttendanceKind.ABSENT,
  );
  const [, action, pending] = useActionState(
    upsertAttendanceAction.bind(null, locale, propertyId, meetingId),
    initial,
  );

  return (
    <TableRow>
      <TableCell>{unitCode}</TableCell>
      <TableCell>{saved?.blockName ?? blockName}</TableCell>
      <TableCell>{saved?.partyName ?? "—"}</TableCell>
      <TableCell>
        <Select
          value={attendanceKind}
          onValueChange={(value) => setAttendanceKind(value as AssemblyAttendanceKind)}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(AssemblyAttendanceKind).map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(`attendanceKind.${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          form={`attendance-${unitId}`}
          name="proxyHolderName"
          defaultValue={saved?.proxyHolderName ?? ""}
          placeholder={t("fieldProxyHolder")}
          className="h-8 w-full min-w-[140px]"
        />
      </TableCell>
      <TableCell>
        <form id={`attendance-${unitId}`} action={action}>
          <input type="hidden" name="unitId" value={unitId} />
          <input type="hidden" name="attendanceKind" value={attendanceKind} />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {t("saveAttendance")}
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}
