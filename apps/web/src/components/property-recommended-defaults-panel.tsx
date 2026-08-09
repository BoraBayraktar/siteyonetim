"use client";

import type { PropertyRecommendedDefaultsDto } from "@siteyonetim/property-settings";
import { Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { applyRecommendedDefaultsAction } from "@/app/actions/property-settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  locale: string;
  propertyId: string;
  recommendations: PropertyRecommendedDefaultsDto;
  canMutate: boolean;
};

export function PropertyRecommendedDefaultsPanel({ locale, propertyId, recommendations, canMutate }: Props) {
  const t = useTranslations("uiMode");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [applySimpleMode, setApplySimpleMode] = useState(recommendations.suggestSimpleMode);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasSuggestions =
    recommendations.suggestDefaultBlock ||
    recommendations.suggestDefaultCashbox ||
    recommendations.suggestSimpleMode;

  if (!hasSuggestions || !canMutate) {
    return null;
  }

  const suggestionLines: string[] = [];
  if (recommendations.suggestDefaultBlock) {
    suggestionLines.push(t("suggestBlock", { name: recommendations.defaultBlockName }));
  }
  if (recommendations.suggestDefaultCashbox) {
    suggestionLines.push(t("suggestCashbox", { name: recommendations.defaultCashboxName }));
  }
  if (recommendations.suggestSimpleMode) {
    suggestionLines.push(t("suggestSimpleMode"));
  }

  return (
    <Alert variant="info">
      <Wand2 className="size-4" aria-hidden />
      <AlertTitle>{t("recommendedTitle")}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{t("recommendedDesc")}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {suggestionLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {recommendations.suggestSimpleMode ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id="apply-simple-mode"
              checked={applySimpleMode}
              onCheckedChange={(checked) => setApplySimpleMode(checked === true)}
            />
            <Label htmlFor="apply-simple-mode" className="text-sm font-normal">
              {t("applySimpleModeCheckbox")}
            </Label>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await applyRecommendedDefaultsAction(locale, propertyId, applySimpleMode);
              if (result.error) {
                setError(t(`errors.${result.error}` as "errors.UNAUTHORIZED"));
                return;
              }
              const parts: string[] = [];
              if (result.createdBlock) parts.push(t("appliedBlock"));
              if (result.createdCashbox) parts.push(t("appliedCashbox"));
              if (result.appliedSimpleMode) parts.push(t("appliedSimpleMode"));
              setMessage(parts.length > 0 ? parts.join(" · ") : t("appliedNothing"));
              router.refresh();
            });
          }}
        >
          {t("applyRecommended")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
