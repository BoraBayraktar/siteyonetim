"use client";

import type { UnitDto } from "@siteyonetim/property-core";
import type { MeterReadingDto, UnitMeterDto } from "@siteyonetim/property-meters";
import { useTranslations } from "next-intl";

import { MetersAdminPanel } from "@/components/meters-admin-panel";

type Props = {
  locale: string;
  propertyId: string;
  meters: UnitMeterDto[];
  meterUnits: UnitDto[];
  readingsByMeterId: Record<string, MeterReadingDto[]>;
  canManageMeters?: boolean;
};

export function DuesMetersPanel({
  locale,
  propertyId,
  meters,
  meterUnits,
  readingsByMeterId,
  canManageMeters = true,
}: Props) {
  const t = useTranslations("meters");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{t("accrualSectionTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("accrualSectionHint")}</p>
      </div>
      <MetersAdminPanel
        locale={locale}
        propertyId={propertyId}
        meters={meters}
        units={meterUnits}
        readingsByMeterId={readingsByMeterId}
        canManageMeters={canManageMeters}
      />
    </div>
  );
}
