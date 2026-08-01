import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyFinancePage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page } = await searchParams;
  setRequestLocale(locale);

  const query = new URLSearchParams({ tab: "expenses" });
  if (page) {
    query.set("page", page);
  }

  redirect(`/${locale}/admin/properties/${propertyId}/dues?${query.toString()}`);
}
