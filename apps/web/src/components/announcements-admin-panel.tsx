"use client";

import { AnnouncementAudience } from "@siteyonetim/db";
import type { AnnouncementDto } from "@siteyonetim/comm-announcements";
import { ANNOUNCEMENT_BODY_FORMAT } from "@siteyonetim/comm-announcements/body-format";
import {
  defaultPublishEndDate,
  formatDateInputValue,
  getAnnouncementPublishStatus,
} from "@siteyonetim/comm-announcements/publish-window";
import type { BlockDto, UnitDto } from "@siteyonetim/property-core";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

import { createAnnouncementAction, type AnnouncementActionState } from "@/app/actions/announcements";
import { AnnouncementBodyContent } from "@/components/announcement-body-content";
import { AnnouncementNotifyForm } from "@/components/announcement-notify-form";
import { AnnouncementRichTextEditor } from "@/components/announcement-rich-text-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDrawer } from "@/components/form-drawer";
import { ServerPagination } from "@/components/server-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  locale: string;
  propertyId: string;
  items: AnnouncementDto[];
  page: number;
  pageSize: number;
  total: number;
  blocks: BlockDto[];
  units: UnitDto[];
};

const initial: AnnouncementActionState = {};

function audienceLabel(audience: AnnouncementAudience, t: ReturnType<typeof useTranslations>) {
  if (audience === AnnouncementAudience.BLOCK) return t("audienceBlock");
  if (audience === AnnouncementAudience.UNITS) return t("audienceUnits");
  return t("audienceAll");
}

function formatDateRange(locale: string, start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium" });
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

function publishStatusLabel(status: ReturnType<typeof getAnnouncementPublishStatus>, t: ReturnType<typeof useTranslations>) {
  if (status === "scheduled") return t("statusScheduled");
  if (status === "expired") return t("statusExpired");
  return t("statusActive");
}

export function AnnouncementsAdminPanel({
  locale,
  propertyId,
  items,
  page,
  pageSize,
  total,
  blocks,
  units,
}: Props) {
  const t = useTranslations("announcements");
  const [state, action, pending] = useActionState(
    createAnnouncementAction.bind(null, locale, propertyId),
    initial,
  );
  const [audience, setAudience] = useState<AnnouncementAudience>(AnnouncementAudience.PROPERTY_ALL);
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? "");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [bodyHtml, setBodyHtml] = useState("");
  const today = useMemo(() => new Date(), []);
  const [publishStart, setPublishStart] = useState(() => formatDateInputValue(today));
  const [publishEnd, setPublishEnd] = useState(() => formatDateInputValue(defaultPublishEndDate(today)));

  const unitIdsValue = useMemo(() => selectedUnits.join(","), [selectedUnits]);

  function toggleUnit(unitId: string) {
    setSelectedUnits((prev) => (prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("title")}</CardTitle>
        <FormDrawer triggerLabel={t("createTitle")} title={t("createTitle")} success={state.success}>
          <form action={action} className="grid gap-4">
            <input type="hidden" name="audience" value={audience} />
            <input type="hidden" name="blockId" value={blockId} />
            <input type="hidden" name="unitIds" value={unitIdsValue} />
            <input type="hidden" name="isPinned" value={pinned ? "on" : ""} />
            <input type="hidden" name="body" value={bodyHtml} />
            <input type="hidden" name="bodyFormat" value={ANNOUNCEMENT_BODY_FORMAT.HTML} />
            <div className="grid gap-2">
              <Label htmlFor="ann-title">{t("fieldTitle")}</Label>
              <Input id="ann-title" name="title" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ann-body">{t("fieldBody")}</Label>
              <AnnouncementRichTextEditor
                propertyId={propertyId}
                value={bodyHtml}
                onChange={setBodyHtml}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ann-publish-start">{t("fieldPublishStart")}</Label>
                <Input
                  id="ann-publish-start"
                  name="publishStartAt"
                  type="date"
                  required
                  value={publishStart}
                  onChange={(event) => setPublishStart(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ann-publish-end">{t("fieldPublishEnd")}</Label>
                <Input
                  id="ann-publish-end"
                  name="publishEndAt"
                  type="date"
                  required
                  min={publishStart}
                  value={publishEnd}
                  onChange={(event) => setPublishEnd(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("fieldAudience")}</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AnnouncementAudience.PROPERTY_ALL}>{t("audienceAll")}</SelectItem>
                  <SelectItem value={AnnouncementAudience.BLOCK}>{t("audienceBlock")}</SelectItem>
                  <SelectItem value={AnnouncementAudience.UNITS}>{t("audienceUnits")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audience === AnnouncementAudience.BLOCK ? (
              <div className="grid gap-2">
                <Label>{t("fieldBlock")}</Label>
                <Select value={blockId} onValueChange={setBlockId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pickBlock")} />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {audience === AnnouncementAudience.UNITS ? (
              <div className="grid gap-2">
                <Label>{t("fieldUnits")}</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                  {units.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`unit-${u.id}`}
                        checked={selectedUnits.includes(u.id)}
                        onCheckedChange={() => toggleUnit(u.id)}
                      />
                      <Label htmlFor={`unit-${u.id}`} className="font-normal">
                        {u.code}
                        {u.blockName ? ` (${u.blockName})` : ""}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Checkbox id="ann-pinned" checked={pinned} onCheckedChange={(v) => setPinned(v === true)} />
              <Label htmlFor="ann-pinned" className="font-normal">
                {t("fieldPinned")}
              </Label>
            </div>
            {state.error ? (
              <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {t("publish")}
            </Button>
          </form>
        </FormDrawer>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const publishStatus = getAnnouncementPublishStatus(
                new Date(item.publishStartAt),
                new Date(item.publishEndAt),
              );
              return (
              <li key={item.id} className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {item.isPinned ? <Badge variant="secondary">{t("pinned")}</Badge> : null}
                  <Badge variant="outline">{audienceLabel(item.audience, t)}</Badge>
                  <Badge
                    variant={
                      publishStatus === "active" ? "default" : publishStatus === "scheduled" ? "secondary" : "outline"
                    }
                  >
                    {publishStatusLabel(publishStatus, t)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateRange(locale, item.publishStartAt, item.publishEndAt)}
                  </span>
                </div>
                <h3 className="font-medium">{item.title}</h3>
                <AnnouncementBodyContent body={item.body} bodyFormat={item.bodyFormat} className="mt-2" />
                <AnnouncementNotifyForm locale={locale} propertyId={propertyId} announcementId={item.id} />
              </li>
            );
            })}
          </ul>
        )}
        <ServerPagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath={`/admin/properties/${propertyId}/announcements`}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}
