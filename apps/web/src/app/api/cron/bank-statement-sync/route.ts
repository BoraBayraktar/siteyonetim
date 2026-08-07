import { assertCronAuthorized } from "@/lib/cron-auth";
import { getBankingService } from "@/lib/services";

async function handle(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  const result = await getBankingService().syncRestPollProfiles(null);
  const succeeded = result.properties.filter((row) => row.status === "SUCCEEDED").length;
  const failed = result.properties.filter((row) => row.status === "FAILED").length;

  return Response.json({
    itemCount: result.properties.length,
    succeeded,
    failed,
    properties: result.properties,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
