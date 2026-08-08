import { NextResponse } from "next/server";

import { getPaymentGatewayService } from "@/lib/services";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "tr";

  let token: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    token = String(form.get("token") ?? "") || null;
  } else {
    try {
      const body = (await request.json()) as { token?: string };
      token = body.token ?? null;
    } catch {
      token = url.searchParams.get("token");
    }
  }

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/portal/payment/result?status=failed&code=MISSING_TOKEN`, request.url));
  }

  try {
    const result = await getPaymentGatewayService().completeCheckoutByToken(token, locale);
    const status = result.status === "SUCCEEDED" ? "success" : "failed";
    return NextResponse.redirect(
      new URL(`/${locale}/portal/payment/result?status=${status}&intentId=${result.intentId}`, request.url),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "CALLBACK_FAILED";
    return NextResponse.redirect(
      new URL(`/${locale}/portal/payment/result?status=failed&code=${encodeURIComponent(code)}`, request.url),
    );
  }
}
