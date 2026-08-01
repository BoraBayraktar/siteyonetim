import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUnitService } from "@/lib/services";

type Params = { params: Promise<{ propertyId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { propertyId } = await params;
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "tr";
  const templateOnly = url.searchParams.get("template") === "1";

  try {
    const file = await getUnitService().exportToXlsx({
      organizationId: session.user.organizationId,
      propertyId,
      locale,
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
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_OR_BLOCK_NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
