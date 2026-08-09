"use client";

import type {
  PropertyMonthlyTaskCode,
  PropertyMonthlyTasksDto,
} from "@siteyonetim/reporting-standard";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  propertyId: string;
  tasks: PropertyMonthlyTasksDto;
};

function taskHref(locale: string, propertyId: string, code: PropertyMonthlyTaskCode): string {
  const base = `/${locale}/admin/properties/${propertyId}`;
  switch (code) {
    case "ACCRUAL_NOT_RUN":
    case "DRAFT_ACCRUAL_PENDING":
      return `${base}/dues?tab=accrual`;
    case "METER_READINGS_MISSING":
      return `${base}/dues?tab=meters`;
    case "OVERDUE_UNITS":
      return `${base}/dues?tab=register&overdueOnly=1`;
    case "PERIOD_NOT_CLOSED":
      return `${base}/dues?tab=expenses`;
    default:
      return `${base}/dashboard`;
  }
}

function priorityVariant(priority: PropertyMonthlyTasksDto["tasks"][number]["priority"]) {
  switch (priority) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function PropertyMonthlyTasksPanel({ locale, propertyId, tasks }: Props) {
  const t = useTranslations("monthlyTasks");

  if (tasks.tasks.length === 0) {
    return null;
  }

  const periodLabel = `${tasks.period.month}/${tasks.period.year}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title", { period: periodLabel })}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tasks.tasks.map((task) => (
            <li key={task.code}>
              <Link
                href={taskHref(locale, propertyId, task.code)}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40",
                )}
              >
                <span>
                  {t(`codes.${task.code}`, { count: task.count ?? 0, period: periodLabel })}
                </span>
                <Badge variant={priorityVariant(task.priority)}>{t(`priority.${task.priority}`)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
