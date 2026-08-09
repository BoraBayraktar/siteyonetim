"use client";

import type { AdminOnboardingStateDto } from "@siteyonetim/platform-auth";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  completeAdminOnboardingAction,
  dismissAdminOnboardingAction,
  setAdminOnboardingStepAction,
} from "@/app/actions/user-preferences";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ONBOARDING_STEPS = ["units", "occupancy", "definitions", "cashboxes", "accrual"] as const;

type Props = {
  locale: string;
  propertyId: string;
  onboarding: AdminOnboardingStateDto;
  showTour: boolean;
};

function stepHref(locale: string, propertyId: string, step: (typeof ONBOARDING_STEPS)[number]): string {
  const base = `/${locale}/admin/properties/${propertyId}`;
  switch (step) {
    case "units":
      return `${base}?tab=units`;
    case "occupancy":
      return `${base}?tab=units`;
    case "definitions":
      return `${base}/dues?tab=definitions`;
    case "cashboxes":
      return `${base}/dues?tab=cashboxes`;
    case "accrual":
      return `${base}/dues?tab=accrual`;
    default:
      return `${base}/dashboard`;
  }
}

export function AdminOnboardingTour({ locale, propertyId, onboarding, showTour }: Props) {
  const t = useTranslations("onboarding");
  const [open, setOpen] = useState(showTour);
  const [pending, startTransition] = useTransition();
  const currentIndex = Math.min(Math.max(onboarding.currentStep, 0), ONBOARDING_STEPS.length - 1);
  const currentStep = ONBOARDING_STEPS[currentIndex];
  const isLastStep = currentIndex === ONBOARDING_STEPS.length - 1;

  if (onboarding.completed && !showTour) {
    return null;
  }

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissAdminOnboardingAction(locale);
      setOpen(false);
    });
  };

  const handleComplete = () => {
    startTransition(async () => {
      await completeAdminOnboardingAction(locale);
      setOpen(false);
    });
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    startTransition(async () => {
      await setAdminOnboardingStepAction(locale, currentIndex + 1);
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            {t("stepProgress", { current: currentIndex + 1, total: ONBOARDING_STEPS.length })}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm font-medium">{t(`steps.${currentStep}.title`)}</p>
          <p className="text-sm text-muted-foreground">{t(`steps.${currentStep}.body`)}</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={stepHref(locale, propertyId, currentStep)}>{t("openStep")}</Link>
          </Button>
        </div>
        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Button type="button" onClick={handleNext} disabled={pending}>
            {isLastStep ? t("finish") : t("next")}
          </Button>
          <Button type="button" variant="ghost" onClick={handleDismiss} disabled={pending}>
            {t("skip")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
