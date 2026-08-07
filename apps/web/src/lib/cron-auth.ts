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

const QUARTER_PERIODS = ["Q1", "Q2", "Q3", "Q4"] as const;
type CronQuarterPeriod = (typeof QUARTER_PERIODS)[number];

function isQuarterPeriod(value: string): value is CronQuarterPeriod {
  return QUARTER_PERIODS.includes(value as CronQuarterPeriod);
}

export function parseCronQuarterFromUrl(url: URL): { year: number; period: CronQuarterPeriod } | Response {
  const yearRaw = url.searchParams.get("year");
  const periodRaw = url.searchParams.get("period");
  if (!yearRaw || !periodRaw || !isQuarterPeriod(periodRaw)) {
    return Response.json({ error: "INVALID_QUARTER_PERIOD" }, { status: 400 });
  }
  const year = Number(yearRaw);
  if (!Number.isFinite(year)) {
    return Response.json({ error: "INVALID_YEAR" }, { status: 400 });
  }
  return { year, period: periodRaw };
}

export async function parseCronQuarterBody(
  request: Request,
): Promise<{ year: number; period: CronQuarterPeriod } | Response> {
  let body: { year?: number; period?: string } = {};
  try {
    body = (await request.json()) as { year?: number; period?: string };
  } catch {
    /* empty body ok */
  }
  if (body.year == null || !body.period || !isQuarterPeriod(body.period)) {
    return Response.json({ error: "INVALID_QUARTER_PERIOD" }, { status: 400 });
  }
  return { year: body.year, period: body.period };
}

export async function parseCronQuarterPeriod(
  request: Request,
): Promise<{ year: number; period: CronQuarterPeriod } | Response | null> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    if (url.searchParams.has("year") || url.searchParams.has("period")) {
      return parseCronQuarterFromUrl(url);
    }
    return null;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const parsed = await parseCronQuarterBody(request);
    if (parsed instanceof Response) {
      return parsed;
    }
    return parsed;
  }
  return null;
}
