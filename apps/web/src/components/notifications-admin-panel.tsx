"use client";

import { OutboxChannel, OutboxStatus } from "@siteyonetim/db";
import type { OutboxMessageDto } from "@siteyonetim/comm-notifications";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { processOutboxAction, type NotificationActionState } from "@/app/actions/notifications";
import { ServerPagination } from "@/components/server-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEnumLabel } from "@/lib/use-enum-label";

type Props = {
  locale: string;
  propertyId: string;
  items: OutboxMessageDto[];
  page: number;
  pageSize: number;
  total: number;
};

const initial: NotificationActionState = {};

function statusVariant(status: OutboxStatus): "default" | "secondary" | "outline" {
  if (status === OutboxStatus.SENT) return "secondary";
  if (status === OutboxStatus.FAILED) return "default";
  return "outline";
}

function channelLabel(channel: OutboxChannel, labelEnum: ReturnType<typeof useEnumLabel>) {
  return labelEnum("OutboxChannel", channel);
}

export function NotificationsAdminPanel({ locale, propertyId, items, page, pageSize, total }: Props) {
  const t = useTranslations("notifications");
  const labelEnum = useEnumLabel();
  const [state, action, pending] = useActionState(processOutboxAction.bind(null, locale, propertyId), initial);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("outboxTitle")}</CardTitle>
        <form action={action}>
          <Button type="submit" variant="outline" disabled={pending}>
            {t("processPending")}
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.success ? (
          <p className="text-sm text-muted-foreground">
            {t("processResult", { count: state.processed ?? 0 })}
          </p>
        ) : null}
        {state.error ? (
          <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
        ) : null}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("outboxEmpty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colChannel")}</TableHead>
                <TableHead>{t("colRecipient")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colSubject")}</TableHead>
                <TableHead>{t("colCreated")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{channelLabel(row.channel, labelEnum)}</TableCell>
                  <TableCell className="font-mono text-xs">{row.recipient}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{labelEnum("OutboxStatus", row.status)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.subject ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(row.createdAt))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ServerPagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath={`/admin/properties/${propertyId}/notifications`}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}
