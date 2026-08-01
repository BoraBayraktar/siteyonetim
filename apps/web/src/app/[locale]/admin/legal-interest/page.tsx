import { setRequestLocale } from "next-intl/server";

import { LegalInterestPanel } from "@/components/legal-interest-panel";
import { getDuesService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string }>;
};

export default async function LegalInterestPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();
  const rates = await getDuesService().listLegalInterestRates(year);

  return <LegalInterestPanel locale={locale} year={year} rates={rates} />;
}
