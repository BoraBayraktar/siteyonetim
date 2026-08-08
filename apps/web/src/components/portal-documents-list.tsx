"use client";

import type { DocumentDto } from "@siteyonetim/document-management";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  items: DocumentDto[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalDocumentsList({ items }: Props) {
  const t = useTranslations("portal");

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("documentsEmpty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/15 p-4">
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="outline">
                {t(`documentCategory.${item.category}`, { defaultMessage: item.category })}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {item.fileName} · {formatBytes(item.sizeBytes)}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/api/documents/${item.id}/download`} prefetch={false}>
              {t("documentsDownload")}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
