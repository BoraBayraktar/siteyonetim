"use server";

import { DocumentCategory, DocumentVisibility } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canMutateAdminData } from "@/lib/auth-context";
import { getDocumentService } from "@/lib/services";

export type DocumentActionState = { error?: string; success?: boolean };

async function requireAdminMutate() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  if (!canMutateAdminData(session)) {
    return null;
  }
  return session;
}

export async function createDocumentAction(
  locale: string,
  propertyId: string,
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const session = await requireAdminMutate();
  if (!session) {
    return { error: "UNAUTHORIZED" };
  }

  const visibility = String(formData.get("visibility") ?? DocumentVisibility.ADMIN_ONLY) as DocumentVisibility;
  const category = String(formData.get("category") ?? DocumentCategory.OTHER) as DocumentCategory;
  const unitIdsRaw = String(formData.get("unitIds") ?? "");
  const unitIds = unitIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "DOCUMENT_FILE_REQUIRED" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await getDocumentService().create({
      organizationId: session.user.organizationId,
      propertyId,
      title: String(formData.get("title") ?? ""),
      category,
      visibility,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileBuffer: buffer,
      unitIds,
      actorUserId: session.user.id,
    });
    revalidatePath(`/${locale}/admin/properties/${propertyId}/documents`, "page");
    revalidatePath(`/${locale}/portal`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
