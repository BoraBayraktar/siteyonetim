import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAnnouncementImageService, getOccupancyService } from "@/lib/services";

type Params = { params: Promise<{ propertyId: string; fileName: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { propertyId, fileName } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let portalPropertyIds: string[] = [];
  if (session.user.sessionKind === "PORTAL") {
    const units = await getOccupancyService().listForPortalUser(session.user.id);
    portalPropertyIds = [...new Set(units.map((unit) => unit.propertyId))];
  }

  try {
    const payload = await getAnnouncementImageService().open({
      organizationId: session.user.organizationId,
      propertyId,
      fileName,
      sessionKind: session.user.sessionKind === "PORTAL" ? "PORTAL" : "ADMIN",
      portalPropertyIds,
    });

    return new NextResponse(new Uint8Array(payload.data), {
      headers: {
        "Content-Type": payload.mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(payload.data.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ANNOUNCEMENT_IMAGE_NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "ANNOUNCEMENT_IMAGE_FORBIDDEN") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    throw error;
  }
}
