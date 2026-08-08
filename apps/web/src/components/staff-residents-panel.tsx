"use client";

import type { OccupancySlotDto, UnitOccupancyBoardRowDto } from "@siteyonetim/property-occupancy";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  items: UnitOccupancyBoardRowDto[];
  showPartyPhone: boolean;
};

function OccupancySlotLine({
  label,
  slot,
  showPartyPhone,
  phoneLabel,
}: {
  label: string;
  slot: OccupancySlotDto | null;
  showPartyPhone: boolean;
  phoneLabel: string;
}) {
  if (!slot) {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{label}:</span> —
      </p>
    );
  }

  return (
    <div className="text-sm">
      <p>
        <span className="font-medium">{label}:</span> {slot.partyName}
      </p>
      {showPartyPhone && slot.partyPhone ? (
        <p className="mt-0.5">
          <a href={`tel:${slot.partyPhone}`} className="text-primary underline-offset-4 hover:underline">
            {phoneLabel}: {slot.partyPhone}
          </a>
        </p>
      ) : null}
    </div>
  );
}

export function StaffResidentsPanel({ items, showPartyPhone }: Props) {
  const t = useTranslations("staffPortal");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const haystack = [
        row.code,
        row.blockName ?? "",
        row.owner?.partyName ?? "",
        row.tenant?.partyName ?? "",
        showPartyPhone ? row.owner?.partyPhone ?? "" : "",
        showPartyPhone ? row.tenant?.partyPhone ?? "" : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, showPartyPhone]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>{t("residentsTitle")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {showPartyPhone ? t("residentsSubtitleWithPhone") : t("residentsSubtitle")}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="staff-residents-search">{t("residentsSearch")}</Label>
          <Input
            id="staff-residents-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("residentsSearchPlaceholder")}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("residentsEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((row) => (
              <li key={row.unitId} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">{row.code}</span>
                  {row.blockName ? (
                    <span className="text-xs text-muted-foreground">{row.blockName}</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <OccupancySlotLine
                    label={t("roleOwner")}
                    slot={row.owner}
                    showPartyPhone={showPartyPhone}
                    phoneLabel={t("phone")}
                  />
                  <OccupancySlotLine
                    label={t("roleTenant")}
                    slot={row.tenant}
                    showPartyPhone={showPartyPhone}
                    phoneLabel={t("phone")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
