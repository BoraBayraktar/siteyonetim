import { resolveQuarterReminderDue } from "@siteyonetim/reporting-auditor";

import { getJobService } from "@/lib/jobs";
import { assertCronAuthorized, parseCronQuarterPeriod } from "@/lib/cron-auth";

async function handle(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const explicit = await parseCronQuarterPeriod(request);
  if (explicit instanceof Response) return explicit;

  const due = explicit ?? resolveQuarterReminderDue();
  if (!due) {
    return Response.json({
      skipped: true,
      reason: "NOT_QUARTER_REMINDER_DAY",
      hint: "Runs automatically on Apr 7, Jul 7, Oct 7, Jan 7; or pass ?year=&period=Q1",
    });
  }

  const result = await getJobService().runAuditorQuarterReminders({
    year: due.year,
    period: due.period,
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
