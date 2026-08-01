import { getJobService } from "@/lib/jobs";
import { assertCronAuthorized, parseCronPeriod } from "@/lib/cron-auth";

async function handle(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const period = await parseCronPeriod(request);
  if (period instanceof Response) return period;

  const result = await getJobService().runDueAccrualMonthly({
    year: period.year,
    month: period.month,
    actorUserId: null,
  });
  return Response.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
