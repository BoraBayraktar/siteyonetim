import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getPartyService, getPropertyService } from "@/lib/services";

type Params = { params: Promise<{ propertyId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { propertyId } = await params;
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    return NextResponse.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "tr";
  const templateOnly = url.searchParams.get("template") === "1";

  try {
    const file = await getPartyService().exportToXlsx({
      organizationId,
      locale,
      sheetTitle: property.name,
      templateOnly,
      actorUserId: session.user.id,
    });

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        "Content-Length": String(file.buffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: "EXPORT_FAILED" }, { status: 500 });
  }
}
