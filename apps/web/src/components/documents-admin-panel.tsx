"use client";

import { DocumentCategory, DocumentVisibility } from "@siteyonetim/db";
import type { DocumentDto } from "@siteyonetim/document-management";
import type { UnitDto } from "@siteyonetim/property-core";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { createDocumentAction, type DocumentActionState } from "@/app/actions/documents";
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
  items: DocumentDto[];
  page: number;
  pageSize: number;
  total: number;
  units: UnitDto[];
};

const initial: DocumentActionState = {};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsAdminPanel({ locale, propertyId, items, page, pageSize, total, units }: Props) {
  const t = useTranslations("documents");
  const [state, action, pending] = useActionState(createDocumentAction.bind(null, locale, propertyId), initial);
  const [visibility, setVisibility] = useState<DocumentVisibility>(DocumentVisibility.PORTAL_SHARED);
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.OTHER);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const unitIdsValue = useMemo(() => selectedUnits.join(","), [selectedUnits]);

  function toggleUnit(unitId: string) {
    setSelectedUnits((prev) => (prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("title")}</CardTitle>
        <FormDrawer triggerLabel={t("uploadTitle")} title={t("uploadTitle")} success={state.success}>
          <form action={action} className="grid gap-4" encType="multipart/form-data">
            <input type="hidden" name="visibility" value={visibility} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="unitIds" value={unitIdsValue} />
            <div className="grid gap-2">
              <Label htmlFor="doc-title">{t("fieldTitle")}</Label>
              <Input id="doc-title" name="title" required />
            </div>
            <div className="grid gap-2">
              <Label>{t("fieldCategory")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DocumentCategory).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`category.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("fieldVisibility")}</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as DocumentVisibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DocumentVisibility).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`visibility.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {visibility === DocumentVisibility.UNIT_SPECIFIC ? (
              <div className="grid gap-2">
                <Label>{t("fieldUnits")}</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                  {units.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`doc-unit-${u.id}`}
                        checked={selectedUnits.includes(u.id)}
                        onCheckedChange={() => toggleUnit(u.id)}
                      />
                      <Label htmlFor={`doc-unit-${u.id}`} className="font-normal">
                        {u.code}
                        {u.blockName ? ` (${u.blockName})` : ""}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="doc-file">{t("fieldFile")}</Label>
              <Input id="doc-file" name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
              <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
            </div>
            {state.error ? (
              <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {t("uploadSubmit")}
            </Button>
          </form>
        </FormDrawer>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    <Badge variant="outline">{t(`category.${item.category}`)}</Badge>
                    <Badge variant="secondary">{t(`visibility.${item.visibility}`)}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.fileName} · {formatBytes(item.sizeBytes)}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/api/documents/${item.id}/download`} prefetch={false}>
                    {t("download")}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <ServerPagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath={`/admin/properties/${propertyId}/documents`}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}
