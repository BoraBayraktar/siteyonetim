"use client";

import { AuditorReportStatus } from "@siteyonetim/db";
import type { AuditorReportDto } from "@siteyonetim/reporting-auditor";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import {
  approveAuditorReportAction,
  archiveAuditorReportAction,
  reopenAuditorReportAction,
  type AuditorReportActionState,
} from "@/app/actions/auditor-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale: string;
  propertyId: string;
  report: AuditorReportDto;
};

const initial: AuditorReportActionState = {};

function ErrorText({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}`, { defaultMessage: code })}</p>;
}

export function AuditorReportAdminActions({ locale, propertyId, report }: Props) {
  const t = useTranslations("auditorReport");
  const [approveState, approveAction, approvePending] = useActionState(approveAuditorReportAction, initial);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveAuditorReportAction, initial);
  const [reopenState, reopenAction, reopenPending] = useActionState(reopenAuditorReportAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("adminActionsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.status === AuditorReportStatus.IN_REVIEW ? (
          <form action={approveAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="propertyId" value={propertyId} />
            <input type="hidden" name="reportId" value={report.id} />
            <Button type="submit" disabled={approvePending}>
              {t("approve")}
            </Button>
            <ErrorText code={approveState.error} t={t} />
            {approveState.success ? (
              <p className="text-sm text-emerald-600">{t("approvedSuccess")}</p>
            ) : null}
          </form>
        ) : null}

        {report.status === AuditorReportStatus.APPROVED ? (
          <div className="grid gap-4">
            <form action={archiveAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="propertyId" value={propertyId} />
              <input type="hidden" name="reportId" value={report.id} />
              <Button type="submit" variant="secondary" disabled={archivePending}>
                {t("archive")}
              </Button>
              <ErrorText code={archiveState.error} t={t} />
              {archiveState.success ? (
                <p className="text-sm text-emerald-600">{t("archivedSuccess")}</p>
              ) : null}
            </form>

            <form action={reopenAction} className="grid max-w-lg gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="propertyId" value={propertyId} />
              <input type="hidden" name="reportId" value={report.id} />
              <Label htmlFor="admin-reopen-reason">{t("reopenReason")}</Label>
              <Textarea id="admin-reopen-reason" name="reason" required minLength={10} rows={3} />
              <Button type="submit" variant="outline" disabled={reopenPending}>
                {t("reopenConfirm")}
              </Button>
              <ErrorText code={reopenState.error} t={t} />
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
