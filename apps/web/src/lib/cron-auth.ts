export function assertCronAuthorized(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  const provided = bearer ?? request.headers.get("x-cron-secret")?.trim() ?? null;
  if (!provided || provided !== expected) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

export function defaultCronPeriod(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function parseCronPeriodFromUrl(url: URL): { year: number; month: number } | Response {
  const fallback = defaultCronPeriod();
  const yearRaw = url.searchParams.get("year");
  const monthRaw = url.searchParams.get("month");
  const year = yearRaw ? Number(yearRaw) : fallback.year;
  const month = monthRaw ? Number(monthRaw) : fallback.month;
  if (month < 1 || month > 12) {
    return Response.json({ error: "INVALID_MONTH" }, { status: 400 });
  }
  return { year, month };
}

export async function parseCronPeriodBody(request: Request): Promise<{ year: number; month: number } | Response> {
  let body: { year?: number; month?: number } = {};
  try {
    body = (await request.json()) as { year?: number; month?: number };
  } catch {
    /* empty body ok */
  }
  const fallback = defaultCronPeriod();
  const year = body.year ?? fallback.year;
  const month = body.month ?? fallback.month;
  if (month < 1 || month > 12) {
    return Response.json({ error: "INVALID_MONTH" }, { status: 400 });
  }
  return { year, month };
}

export async function parseCronPeriod(request: Request): Promise<{ year: number; month: number } | Response> {
  if (request.method === "GET") {
    return parseCronPeriodFromUrl(new URL(request.url));
  }
  return parseCronPeriodBody(request);
}
