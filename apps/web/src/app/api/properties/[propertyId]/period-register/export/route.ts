import { ReportExportFormat } from "@siteyonetim/db";
import { auth } from "@/auth";
import { getDuesService, getPropertyService } from "@/lib/services";

function parseFormat(raw: string | null): ReportExportFormat {
  const value = (raw ?? "csv").toLowerCase();
  if (value === "xlsx") return ReportExportFormat.XLSX;
  if (value === "pdf") return ReportExportFormat.PDF;
  return ReportExportFormat.CSV;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ propertyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { propertyId } = await context.params;
  const property = await getPropertyService().getById(session.user.organizationId, propertyId);
  if (!property) {
    return Response.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());
  const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
  const blockId = url.searchParams.get("blockId") || null;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const overdueOnly = url.searchParams.get("overdueOnly") === "1";
  const withDebtOnly = url.searchParams.get("withDebtOnly") === "1";
  const format = parseFormat(url.searchParams.get("format"));
  const locale = url.searchParams.get("locale") ?? "tr";

  if (month < 1 || month > 12) {
    return Response.json({ error: "INVALID_MONTH" }, { status: 400 });
  }

  try {
    const rendered = await getDuesService().exportPeriodRegister({
      organizationId: session.user.organizationId,
      propertyId,
      year,
      month,
      page: 1,
      pageSize: 5000,
      q,
      blockId,
      overdueOnly,
      withDebtOnly,
      format,
      locale,
      actorUserId: session.user.id,
    });

    const filename = `period_register_${propertyId}_${year}-${month}.${rendered.extension}`;
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
    throw error;
  }
}
