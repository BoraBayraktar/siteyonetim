"use client";

import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { startOnlinePaymentAction } from "@/app/actions/payments";

import { Button } from "@/components/ui/button";

type Props = {
  locale: string;
  propertyId: string;
  partyId: string;
  unitId?: string;
  openDebt: string;
  disabled?: boolean;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

export function PortalOnlinePaymentButton({
  locale,
  propertyId,
  partyId,
  unitId,
  openDebt,
  disabled,
}: Props) {
  const t = useTranslations("portal");
  const [error, setError] = useState<string | null>(null);
  const [pending, startPay] = useTransition();

  function handlePay() {
    setError(null);
    startPay(async () => {
      const result = await startOnlinePaymentAction(locale, propertyId, partyId, unitId ?? null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl;
      }
    });
  }

  if (Number(openDebt) <= 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("onlinePaymentTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("onlinePaymentSubtitle")}</p>
        </div>
        <Button type="button" onClick={handlePay} disabled={disabled || pending}>
          <CreditCard className="mr-2 size-4" />
          {pending ? t("onlinePaymentPending") : t("onlinePaymentPay", { amount: money(openDebt, locale) })}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{t(`onlinePaymentErrors.${error}`, { defaultMessage: error })}</p>
      ) : null}
    </div>
  );
}
