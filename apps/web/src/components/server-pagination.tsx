"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type ServerPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  locale: string;
};

export function ServerPagination({ page, pageSize, total, basePath, locale }: ServerPaginationProps) {
  const t = useTranslations("properties");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("pagination", { page, totalPages, total })}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={`/${locale}${basePath}?page=${prevPage}`}>←</Link>
          ) : (
            <span>←</span>
          )}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
          {page < totalPages ? (
            <Link href={`/${locale}${basePath}?page=${nextPage}`}>→</Link>
          ) : (
            <span>→</span>
          )}
        </Button>
      </div>
    </div>
  );
}
