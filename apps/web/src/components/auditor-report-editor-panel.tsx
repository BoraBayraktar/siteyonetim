"use client";

import { AuditorDischargeRecommendation, AuditorReportStatus } from "@siteyonetim/db";
import type { AuditorReportDto } from "@siteyonetim/reporting-auditor";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  saveAuditorReportDraftAction,
  submitAuditorReportAction,
  type AuditorReportActionState,
} from "@/app/actions/auditor-report";
import { AuditorRichTextEditor } from "@/components/auditor-rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  locale: string;
  propertyId: string;
  assignmentId: string;
  report: AuditorReportDto;
  readOnly?: boolean;
};

const initial: AuditorReportActionState = {};

const dischargeOptions = [
  AuditorDischargeRecommendation.RECOMMEND,
  AuditorDischargeRecommendation.NOT_RECOMMEND,
  AuditorDischargeRecommendation.CONDITIONAL,
];

function ErrorText({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}`, { defaultMessage: code })}</p>;
}

export function AuditorReportEditorPanel({
  locale,
  propertyId,
  assignmentId,
  report,
  readOnly = false,
}: Props) {
  const t = useTranslations("auditorReport");
  const [saveState, saveAction, savePending] = useActionState(saveAuditorReportDraftAction, initial);
  const [submitState, submitAction, submitPending] = useActionState(submitAuditorReportAction, initial);

  const editable =
    !readOnly &&
    (report.status === AuditorReportStatus.DRAFT || report.status === AuditorReportStatus.IN_REVIEW);

  const [findingsHtml, setFindingsHtml] = useState(report.findingsHtml ?? "");
  const [opinionHtml, setOpinionHtml] = useState(report.opinionHtml ?? "");
  const [dischargeRecommendation, setDischargeRecommendation] = useState<
    AuditorDischargeRecommendation | "NONE"
  >(report.dischargeRecommendation ?? "NONE");

  const actionError = saveState.error ?? submitState.error;
  const actionSuccess = saveState.success || submitState.success;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t("editorTitle")}</CardTitle>
            <CardDescription>
              {t("editorSubtitle", { year: report.year, period: t(`periods.${report.period}`) })}
            </CardDescription>
          </div>
          <Badge variant="secondary">{t(`status.${report.status}`)}</Badge>
        </div>
        {readOnly ? <p className="text-sm text-muted-foreground">{t("readOnlyNotice")}</p> : null}
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("legalDisclaimer")}</p>
        {report.status === AuditorReportStatus.APPROVED ? (
          <p className="text-sm text-muted-foreground">{t("approvedNotice")}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <form className="grid gap-6">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="reportId" value={report.id} />
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="findingsHtml" value={findingsHtml} />
          <input type="hidden" name="opinionHtml" value={opinionHtml} />
          <input
            type="hidden"
            name="dischargeRecommendation"
            value={dischargeRecommendation === "NONE" ? "" : dischargeRecommendation}
          />

          <div className="grid gap-2">
            <Label>{t("findings")}</Label>
            <AuditorRichTextEditor
              value={findingsHtml}
              onChange={setFindingsHtml}
              disabled={!editable}
              placeholder={t("findingsPlaceholder")}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t("opinion")}</Label>
            <AuditorRichTextEditor
              value={opinionHtml}
              onChange={setOpinionHtml}
              disabled={!editable}
              placeholder={t("opinionPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("opinionHint")}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="discharge">{t("dischargeRecommendation")}</Label>
            <Select
              value={dischargeRecommendation}
              onValueChange={(value) =>
                setDischargeRecommendation(value as AuditorDischargeRecommendation | "NONE")
              }
              disabled={!editable}
            >
              <SelectTrigger id="discharge">
                <SelectValue placeholder={t("dischargePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t("dischargeNone")}</SelectItem>
                {dischargeOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`discharge.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ErrorText code={actionError} t={t} />
          {actionSuccess ? <p className="text-sm text-emerald-600">{t("saved")}</p> : null}

          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button formAction={saveAction} type="submit" variant="secondary" disabled={savePending}>
                {t("saveDraft")}
              </Button>
              {report.status === AuditorReportStatus.DRAFT ? (
                <Button formAction={submitAction} type="submit" disabled={submitPending}>
                  {t("submitForReview")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
