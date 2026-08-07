import { extractBearerSecret } from "@siteyonetim/finance-banking";

import { getBankingService } from "@/lib/services";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function mapWebhookError(error: Error): { message: string; status: number } {
  switch (error.message) {
    case "BANK_WEBHOOK_DISABLED":
      return { message: error.message, status: 403 };
    case "BANK_WEBHOOK_UNAUTHORIZED":
      return { message: error.message, status: 401 };
    case "BANK_WEBHOOK_CASHBOX_REQUIRED":
    case "CASHBOX_NOT_FOUND":
    case "BANK_WEBHOOK_PAYLOAD_INVALID":
    case "BANK_WEBHOOK_LINES_REQUIRED":
    case "BANK_WEBHOOK_DATE_INVALID":
    case "BANK_WEBHOOK_AMOUNT_INVALID":
    case "BANK_WEBHOOK_PERIOD_INVALID":
      return { message: error.message, status: 400 };
    default:
      return { message: "BANK_WEBHOOK_IMPORT_FAILED", status: 500 };
  }
}

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
    if (error instanceof Error) {
      const mapped = mapWebhookError(error);
      return Response.json({ error: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
