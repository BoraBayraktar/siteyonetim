import { extractBearerSecret } from "@siteyonetim/finance-banking";

import { getBankingService } from "@/lib/services";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { propertyId } = await context.params;
  const secret = extractBearerSecret(request);
  if (!secret) {
    return Response.json({ error: "BANK_WEBHOOK_UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "BANK_WEBHOOK_PAYLOAD_INVALID" }, { status: 400 });
  }

  try {
    const result = await getBankingService().importFromWebhook(propertyId, secret, body);
    return Response.json({
      importId: result.import.id,
      lineCount: result.import.lineCount,
      matchedOnImport: result.matchedOnImport,
    });
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    const clientErrors = new Set([
      "BANK_WEBHOOK_DISABLED",
      "BANK_WEBHOOK_UNAUTHORIZED",
      "BANK_WEBHOOK_CASHBOX_REQUIRED",
      "BANK_WEBHOOK_PAYLOAD_INVALID",
      "BANK_WEBHOOK_LINES_REQUIRED",
      "BANK_WEBHOOK_DATE_INVALID",
      "BANK_WEBHOOK_AMOUNT_INVALID",
      "BANK_WEBHOOK_PERIOD_INVALID",
      "CASHBOX_NOT_FOUND",
    ]);

    if (clientErrors.has(error.message)) {
      const status =
        error.message === "BANK_WEBHOOK_UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: error.message }, { status });
    }

    throw error;
  }
}
