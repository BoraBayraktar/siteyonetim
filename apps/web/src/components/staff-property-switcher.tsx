"use client";

import { useTranslations } from "next-intl";

import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { staffPropertyPath } from "@/lib/staff-landing-path";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  locale: string;
  propertiesNav: AdminPropertyNavItem[];
  currentPropertyId: string;
};

export function StaffPropertySwitcher({ locale, propertiesNav, currentPropertyId }: Props) {
  const t = useTranslations("staffPortal");

  if (propertiesNav.length <= 1) {
    const property = propertiesNav[0];
    return property ? (
      <p className="truncate text-xs text-muted-foreground">{property.name}</p>
    ) : null;
  }

  return (
    <Select
      value={currentPropertyId}
      onValueChange={(nextId) => {
        window.location.href = staffPropertyPath(locale, nextId);
      }}
    >
      <SelectTrigger className="h-8 max-w-[12rem] text-xs" aria-label={t("switchProperty")}>
        <SelectValue placeholder={t("switchProperty")} />
      </SelectTrigger>
      <SelectContent>
        {propertiesNav.map((property) => (
          <SelectItem key={property.id} value={property.id}>
            {property.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
