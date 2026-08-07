"use client";

import { AuditorReportPeriod, AuditorReportStatus } from "@siteyonetim/db";
import type { AuditorAssignmentDto } from "@siteyonetim/reporting-auditor";
import type { OrgUserDto } from "@siteyonetim/platform-rbac";
import { CheckCircle2, ExternalLink, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  assignAuditorAction,
  revokeAuditorAssignmentAction,
  type AuditorAssignmentActionState,
} from "@/app/actions/auditor-assignment";
import {
  approveAuditorReportAction,
  reopenAuditorReportAction,
  type AuditorReportActionState,
} from "@/app/actions/auditor-report";
import { FormDrawer } from "@/components/form-drawer";
import { ServerPagination } from "@/components/server-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale: string;
  propertyId: string;
  year: number;
  assignments: AuditorAssignmentDto[];
  page: number;
  pageSize: number;
  total: number;
  auditors: OrgUserDto[];
  canManage: boolean;
};

const initial: AuditorAssignmentActionState = {};
const reportInitial: AuditorReportActionState = {};

const periods = [
  AuditorReportPeriod.ANNUAL,
  AuditorReportPeriod.Q1,
  AuditorReportPeriod.Q2,
  AuditorReportPeriod.Q3,
  AuditorReportPeriod.Q4,
];

function ErrorText({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}`, { defaultMessage: code })}</p>;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AssignAuditorDrawer({
  locale,
  propertyId,
  year,
  auditors,
}: {
  locale: string;
  propertyId: string;
  year: number;
  auditors: OrgUserDto[];
}) {
  const t = useTranslations("auditorReport");
  const tReports = useTranslations("reports");
  const [state, action, pending] = useActionState(assignAuditorAction, initial);
  const [period, setPeriod] = useState<AuditorReportPeriod>(AuditorReportPeriod.ANNUAL);
  const [auditorUserId, setAuditorUserId] = useState(auditors[0]?.userId ?? "");

  return (
    <FormDrawer triggerLabel={t("assignAuditor")} title={t("assignTitle")} success={state.success}>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="year" value={String(year)} />
        <input type="hidden" name="period" value={period} />
        <input type="hidden" name="auditorUserId" value={auditorUserId} />

        <div className="grid gap-2">
          <Label>{tReports("year")}</Label>
          <p className="text-sm font-medium">{year}</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assign-period">{t("period")}</Label>
          <Select value={period} onValueChange={(value) => setPeriod(value as AuditorReportPeriod)}>
            <SelectTrigger id="assign-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`periods.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assign-auditor">{t("auditor")}</Label>
          {auditors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAuditors")}</p>
          ) : (
            <Select value={auditorUserId} onValueChange={setAuditorUserId}>
              <SelectTrigger id="assign-auditor">
                <SelectValue placeholder={t("selectAuditor")} />
              </SelectTrigger>
              <SelectContent>
                {auditors.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <ErrorText code={state.error} t={t} />

        <Button type="submit" disabled={pending || auditors.length === 0}>
          {t("assignAuditor")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function RevokeAssignmentButton({
  locale,
  propertyId,
  assignmentId,
}: {
  locale: string;
  propertyId: string;
  assignmentId: string;
}) {
  const t = useTranslations("auditorReport");
  const [state, action, pending] = useActionState(revokeAuditorAssignmentAction, initial);

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <DropdownMenuItem asChild>
        <button type="submit" className="w-full cursor-pointer" disabled={pending}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t("revoke")}
        </button>
      </DropdownMenuItem>
      {state.error ? <ErrorText code={state.error} t={t} /> : null}
    </form>
  );
}

function ApproveReportButton({
  locale,
  propertyId,
  reportId,
}: {
  locale: string;
  propertyId: string;
  reportId: string;
}) {
  const t = useTranslations("auditorReport");
  const [state, action, pending] = useActionState(approveAuditorReportAction, reportInitial);

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="reportId" value={reportId} />
      <DropdownMenuItem asChild>
        <button type="submit" className="w-full cursor-pointer" disabled={pending}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t("approve")}
        </button>
      </DropdownMenuItem>
      {state.error ? <ErrorText code={state.error} t={t} /> : null}
      {state.success ? <p className="px-2 text-xs text-emerald-600">{t("approvedSuccess")}</p> : null}
    </form>
  );
}

function AssignmentRowActions({
  locale,
  propertyId,
  row,
}: {
  locale: string;
  propertyId: string;
  row: AuditorAssignmentDto;
}) {
  const t = useTranslations("auditorReport");
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenState, reopenAction, reopenPending] = useActionState(reopenAuditorReportAction, reportInitial);

  useEffect(() => {
    if (reopenState.success) {
      setReopenOpen(false);
    }
  }, [reopenState.success]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {row.reportId ? (
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/admin/properties/${propertyId}/reports/audit/${row.reportId}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("viewReport")}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {row.reportId && row.reportStatus === AuditorReportStatus.IN_REVIEW ? (
            <ApproveReportButton locale={locale} propertyId={propertyId} reportId={row.reportId} />
          ) : null}
          {row.reportId && row.reportStatus === AuditorReportStatus.APPROVED ? (
            <DropdownMenuItem onSelect={() => setReopenOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("reopen")}
            </DropdownMenuItem>
          ) : null}
          {row.reportId ? <DropdownMenuSeparator /> : null}
          <RevokeAssignmentButton locale={locale} propertyId={propertyId} assignmentId={row.id} />
        </DropdownMenuContent>
      </DropdownMenu>
      {row.reportId ? (
        <FormDrawer
          triggerLabel={t("reopen")}
          title={t("reopenTitle")}
          open={reopenOpen}
          onOpenChange={setReopenOpen}
          hideTrigger
          success={reopenState.success}
        >
          <form action={reopenAction} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="propertyId" value={propertyId} />
            <input type="hidden" name="reportId" value={row.reportId} />
            <div className="grid gap-2">
              <Label htmlFor={`reopen-${row.id}`}>{t("reopenReason")}</Label>
              <Textarea id={`reopen-${row.id}`} name="reason" required minLength={10} rows={4} />
            </div>
            <ErrorText code={reopenState.error} t={t} />
            <Button type="submit" variant="secondary" disabled={reopenPending}>
              {t("reopenConfirm")}
            </Button>
          </form>
        </FormDrawer>
      ) : null}
    </>
  );
}

export function AuditorAssignmentPanel({
  locale,
  propertyId,
  year,
  assignments,
  page,
  pageSize,
  total,
  auditors,
  canManage,
}: Props) {
  const t = useTranslations("auditorReport");
  const tReports = useTranslations("reports");

  const propertyAuditors = useMemo(
    () =>
      auditors.filter((user) =>
        user.propertyAccess.some((entry) => entry.propertyId === propertyId),
      ),
    [auditors, propertyId],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>{t("assignmentsTitle")}</CardTitle>
          <CardDescription>{t("assignmentsSubtitle")}</CardDescription>
        </div>
        {canManage ? (
          <AssignAuditorDrawer
            locale={locale}
            propertyId={propertyId}
            year={year}
            auditors={propertyAuditors}
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tReports("year")}</TableHead>
                  <TableHead>{t("period")}</TableHead>
                  <TableHead>{t("auditor")}</TableHead>
                  <TableHead>{t("assignedAt")}</TableHead>
                  <TableHead>{t("reportStatus")}</TableHead>
                  {canManage ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{t(`periods.${row.period}`)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.auditorName}</div>
                      <div className="text-xs text-muted-foreground">{row.auditorEmail}</div>
                    </TableCell>
                    <TableCell>{formatDate(row.assignedAt, locale)}</TableCell>
                    <TableCell>
                      {row.reportStatus ? (
                        <Badge variant="secondary">{t(`status.${row.reportStatus}`)}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {canManage ? (
                      <TableCell>
                        <AssignmentRowActions locale={locale} propertyId={propertyId} row={row} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ServerPagination
          page={page}
          pageSize={pageSize}
          total={total}
          locale={locale}
          basePath={`/admin/properties/${propertyId}/reports`}
          extraSearchParams={{ year: String(year), report: "AUDITOR_REPORT_TEMPLATE" }}
        />
      </CardContent>
    </Card>
  );
}
