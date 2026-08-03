"use client";

import type { ApprovedAuditorReportOptionDto, GeneralAssemblyMeetingDto } from "@siteyonetim/property-governance";
import { GeneralAssemblyMeetingType } from "@siteyonetim/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import { createMeetingAction, type GovernanceActionState } from "@/app/actions/governance";

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
  year: number;
  meetings: GeneralAssemblyMeetingDto[];
  page: number;
  pageSize: number;
  total: number;
  approvedReports: ApprovedAuditorReportOptionDto[];
  readOnly?: boolean;
};

function formatDate(value: Date | string, locale: string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

export function GovernanceMeetingsPanel({
  locale,
  propertyId,
  year,
  meetings,
  page,
  pageSize,
  total,
  approvedReports,
  readOnly = false,
}: Props) {
  const t = useTranslations("governance");
  const router = useRouter();
  const [meetingType, setMeetingType] = useState<GeneralAssemblyMeetingType>(
    GeneralAssemblyMeetingType.ORDINARY,
  );
  const [linkedReportId, setLinkedReportId] = useState("");

  const [createState, createAction, createPending] = useActionState(
    createMeetingAction.bind(null, locale, propertyId),
    {} as GovernanceActionState,
  );

  useEffect(() => {
    if (createState.success && createState.meetingId && !readOnly) {
      router.push(`/${locale}/admin/properties/${propertyId}/governance/${createState.meetingId}`);
    }
  }, [createState.success, createState.meetingId, locale, propertyId, readOnly, router]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const basePath = readOnly
    ? `/${locale}/auditor/properties/${propertyId}/governance`
    : `/${locale}/admin/properties/${propertyId}/governance`;

  return (
    <div className="space-y-6">
      {!readOnly ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("createTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="gov-type">{t("meetingType")}</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as GeneralAssemblyMeetingType)}>
                  <SelectTrigger id="gov-type">
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
                <Label htmlFor="gov-date">{t("meetingDate")}</Label>
                <Input id="gov-date" name="meetingDate" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gov-location">{t("location")}</Label>
                <Input id="gov-location" name="location" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gov-notice-date">{t("noticeSentAt")}</Label>
                <Input id="gov-notice-date" name="noticeSentAt" type="date" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gov-notice-method">{t("noticeMethod")}</Label>
                <Input id="gov-notice-method" name="noticeMethod" placeholder={t("noticeMethodPlaceholder")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gov-linked-report">{t("linkedReport")}</Label>
                <Select value={linkedReportId} onValueChange={setLinkedReportId}>
                  <SelectTrigger id="gov-linked-report">
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
                <Label htmlFor="gov-agenda">{t("agendaSummary")}</Label>
                <Textarea id="gov-agenda" name="agendaSummary" rows={3} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createPending}>
                  {t("createSubmit")}
                </Button>
              </div>
            </form>
            {createState.error ? (
              <p className="mt-3 text-sm text-destructive">{t(`errors.${createState.error}` as "errors.UNAUTHORIZED")}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meetingDate")}</TableHead>
                  <TableHead>{t("meetingType")}</TableHead>
                  <TableHead>{t("presentCount")}</TableHead>
                  <TableHead>{t("decisionCount")}</TableHead>
                  <TableHead>{t("linkedReport")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell>{formatDate(meeting.meetingDate, locale)}</TableCell>
                    <TableCell>{t(`type.${meeting.meetingType}`)}</TableCell>
                    <TableCell>
                      {meeting.presentCount} / {meeting.attendanceCount}
                    </TableCell>
                    <TableCell>{meeting.decisionCount}</TableCell>
                    <TableCell>{meeting.linkedReportLabel ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`${basePath}/${meeting.id}`}>{t("openMeeting")}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 ? (
            <div className="mt-4 flex gap-2">
              {page > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}?year=${year}&page=${page - 1}`}>{t("prevPage")}</Link>
                </Button>
              ) : null}
              {page < totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}?year=${year}&page=${page + 1}`}>{t("nextPage")}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
