"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ServerPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  locale: string;
  extraSearchParams?: Record<string, string | undefined>;
  variant?: "simple" | "saas";
};

function buildPageHref(
  locale: string,
  basePath: string,
  page: number,
  extraSearchParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (extraSearchParams) {
    for (const [key, value] of Object.entries(extraSearchParams)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  return `/${locale}${basePath}?${params.toString()}`;
}

function pageWindow(current: number, totalPages: number, size = 5) {
  if (totalPages <= size) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const half = Math.floor(size / 2);
  let start = Math.max(1, current - half);
  let end = start + size - 1;
  if (end > totalPages) {
    end = totalPages;
    start = end - size + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function ServerPagination({
  page,
  pageSize,
  total,
  basePath,
  locale,
  extraSearchParams,
  variant = "simple",
}: ServerPaginationProps) {
  const t = useTranslations("properties");
  const tDebt = useTranslations("unitsDebt");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(page * pageSize, total);
  const pages = pageWindow(page, totalPages);

  if (variant === "saas") {
    return (
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {tDebt("showingResults", { from, to, total })}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
            {page > 1 ? (
              <Link href={buildPageHref(locale, basePath, prevPage, extraSearchParams)} aria-label={tDebt("previousPage")}>
                ←
              </Link>
            ) : (
              <span aria-hidden>←</span>
            )}
          </Button>
          {pages.map((pageNumber) => (
            <Button
              key={pageNumber}
              variant={pageNumber === page ? "default" : "outline"}
              size="sm"
              className={cn("min-w-9 px-3", pageNumber !== page && "bg-background")}
              asChild={pageNumber !== page}
            >
              {pageNumber === page ? (
                <span>{pageNumber}</span>
              ) : (
                <Link href={buildPageHref(locale, basePath, pageNumber, extraSearchParams)}>{pageNumber}</Link>
              )}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
            {page < totalPages ? (
              <Link href={buildPageHref(locale, basePath, nextPage, extraSearchParams)} aria-label={tDebt("nextPage")}>
                →
              </Link>
            ) : (
              <span aria-hidden>→</span>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("pagination", { page, totalPages, total })}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={buildPageHref(locale, basePath, prevPage, extraSearchParams)}>←</Link>
          ) : (
            <span>←</span>
          )}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
          {page < totalPages ? (
            <Link href={buildPageHref(locale, basePath, nextPage, extraSearchParams)}>→</Link>
          ) : (
            <span>→</span>
          )}
        </Button>
      </div>
    </div>
  );
}
