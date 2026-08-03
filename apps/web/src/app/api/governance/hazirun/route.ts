import { auth } from "@/auth";
import { canAccessReports } from "@/lib/auth-context";
import { getGovernanceService, getPropertyService } from "@/lib/services";

export async function GET(request: Request) {
  const session = await auth();
  if (!canAccessReports(session)) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId") ?? "";
  const meetingId = url.searchParams.get("meetingId") ?? "";
  const locale = url.searchParams.get("locale") ?? "tr";

  if (!propertyId || !meetingId) {
    return new Response("BAD_REQUEST", { status: 400 });
  }

  const organizationId = session!.user!.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    return new Response("NOT_FOUND", { status: 404 });
  }

  try {
    const rendered = await getGovernanceService().exportHazirunPdf({
      organizationId,
      propertyId,
      actorUserId: session!.user!.id,
      meetingId,
      locale,
      propertyName: property.name,
    });

    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(rendered.buffer), {
      headers: {
        "Content-Type": rendered.contentType,
        "Content-Disposition": `attachment; filename="hazirun_${date}.${rendered.extension}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MEETING_NOT_FOUND") {
      return new Response("NOT_FOUND", { status: 404 });
    }
    throw error;
  }
}
