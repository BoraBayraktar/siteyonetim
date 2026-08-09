"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { setUiModeAction } from "@/app/actions/property-settings";
import { usePropertyUiMode } from "@/components/property-ui-mode-context";
import { Button } from "@/components/ui/button";
import type { PropertyUiMode } from "@/lib/admin-nav-capabilities-types";
import { propertyUiModeToDb } from "@/lib/admin-nav-capabilities-types";

type Props = {
  locale: string;
  propertyId: string;
  targetMode: PropertyUiMode;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  label?: string;
};

export function PropertyUiModeToggle({
  locale,
  propertyId,
  targetMode,
  variant = "outline",
  size = "sm",
  label,
}: Props) {
  const t = useTranslations("uiMode");
  const router = useRouter();
  const { setPropertyUiMode } = usePropertyUiMode();
  const [pending, startTransition] = useTransition();

  const displayLabel =
    label ?? (targetMode === "simple" ? t("switchToSimple") : t("switchToStandard"));

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await setUiModeAction(locale, propertyId, propertyUiModeToDb(targetMode));
          if (result.error) return;
          setPropertyUiMode(targetMode);
          router.refresh();
        });
      }}
    >
      {displayLabel}
    </Button>
  );
}
