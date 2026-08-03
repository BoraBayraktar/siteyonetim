import { getJobService } from "@/lib/jobs";
import { assertCronAuthorized } from "@/lib/cron-auth";

async function handle(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const result = await getJobService().runBankStatementSync({ actorUserId: null });
  return Response.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
