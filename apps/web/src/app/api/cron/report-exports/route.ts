import { getReportingService } from "@/lib/services";
import { assertCronAuthorized } from "@/lib/cron-auth";

async function handle(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 20;

  const result = await getReportingService().processPendingExports(Number.isFinite(limit) ? limit : 20);
  return Response.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
