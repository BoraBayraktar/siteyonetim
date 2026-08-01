import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertyMetersPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);
  redirect(`/${locale}/admin/properties/${propertyId}/dues?tab=accrual&section=meters`);
}
