"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function AdminSidebarSearch({ value, onChange }: Props) {
  const t = useTranslations("nav");

  return (
    <div className="px-3 pb-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-9 pr-8 pl-8 text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={t("searchClear")}
            onClick={() => onChange("")}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
