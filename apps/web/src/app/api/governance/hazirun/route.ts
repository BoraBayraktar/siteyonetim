import { auth } from "@/auth";
import { canAccessReports } from "@/lib/auth-context";
import { getGovernanceService, getPropertyService } from "@/lib/services";

export async function GET(request: Request) {
  const session = await auth();
  if (!canAccessReports(session)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  const meetingId = url.searchParams.get("meetingId");
  const locale = url.searchParams.get("locale") ?? "tr";

  if (!propertyId || !meetingId) {
    return Response.json({ error: "PROPERTY_AND_MEETING_REQUIRED" }, { status: 400 });
  }

  const property = await getPropertyService().getById(session!.user!.organizationId, propertyId);
  if (!property) {
    return Response.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });
  }

  try {
    const rendered = await getGovernanceService().exportHazirunPdf({
      organizationId: session!.user!.organizationId,
      propertyId,
      actorUserId: session!.user!.id,
      meetingId,
      locale,
    });

    return new Response(new Uint8Array(rendered.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${rendered.fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MEETING_NOT_FOUND") {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
