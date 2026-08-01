import { auth } from "@/auth";
import { canAccessReports } from "@/lib/auth-context";
import { getReportingService } from "@/lib/services";

export async function GET(
  _request: Request,
  context: { params: Promise<{ exportId: string }> },
) {
  const session = await auth();
  if (!canAccessReports(session)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { exportId } = await context.params;
  try {
    const { data, fileName, contentType } = await getReportingService().readExportFile(
      session!.user!.organizationId,
      exportId,
    );
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "REPORT_EXPORT_NOT_FOUND") {
        return Response.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "REPORT_EXPORT_NOT_READY") {
        return Response.json({ error: error.message }, { status: 409 });
      }
    }
    throw error;
  }
}
