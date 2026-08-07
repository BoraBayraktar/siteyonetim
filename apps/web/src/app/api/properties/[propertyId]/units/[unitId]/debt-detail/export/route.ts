import { ReportExportFormat } from "@siteyonetim/db";
import { auth } from "@/auth";
import { getDuesService, getPropertyService } from "@/lib/services";

function parseFormat(raw: string | null): ReportExportFormat {
  const value = (raw ?? "xlsx").toLowerCase();
  if (value === "csv") return ReportExportFormat.CSV;
  if (value === "pdf") return ReportExportFormat.PDF;
  return ReportExportFormat.XLSX;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ propertyId: string; unitId: string }> },
) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { propertyId, unitId } = await context.params;
  const property = await getPropertyService().getById(session.user.organizationId, propertyId);
  if (!property) {
    return Response.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());
  const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
  const format = parseFormat(url.searchParams.get("format"));
  const locale = url.searchParams.get("locale") ?? "tr";

  if (month < 1 || month > 12) {
    return Response.json({ error: "INVALID_MONTH" }, { status: 400 });
  }

  try {
    const rendered = await getDuesService().exportUnitDebtDetail({
      organizationId: session.user.organizationId,
      propertyId,
      unitId,
      year,
      month,
      format,
      locale,
      actorUserId: session.user.id,
    });

    const filename = `unit_debt_detail_${unitId}_${year}-${month}.${rendered.extension}`;
    return new Response(new Uint8Array(rendered.buffer), {
      headers: {
        "Content-Type": rendered.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_FOUND") {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
