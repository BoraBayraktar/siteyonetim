import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentService, getOccupancyService } from "@/lib/services";

type Params = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { documentId } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;
  let portalScopes: { propertyId: string; unitId: string }[] = [];

  if (session.user.sessionKind === "PORTAL") {
    const units = await getOccupancyService().listForPortalUser(session.user.id);
    portalScopes = units.map((u) => ({ propertyId: u.propertyId, unitId: u.unitId }));
  }

  try {
    const payload = await getDocumentService().openDownload({
      organizationId,
      documentId,
      sessionKind: session.user.sessionKind === "PORTAL" ? "PORTAL" : "ADMIN",
      portalScopes,
    });

    return new NextResponse(new Uint8Array(payload.data), {
      headers: {
        "Content-Type": payload.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.fileName)}"`,
        "Content-Length": String(payload.data.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DOCUMENT_NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "DOCUMENT_FORBIDDEN") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    throw error;
  }
}
