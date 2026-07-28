"use server";

import { PropertyKind } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getPropertyService } from "@/lib/services";

export type CreatePropertyState = {
  error?: string;
  success?: boolean;
};

export async function createPropertyAction(
  _prev: CreatePropertyState,
  formData: FormData,
): Promise<CreatePropertyState> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { error: "UNAUTHORIZED" };
  }

  const name = String(formData.get("name") ?? "");
  const address = String(formData.get("address") ?? "");
  const kind = String(formData.get("kind") ?? PropertyKind.APARTMAN) as PropertyKind;

  try {
    await getPropertyService().create({
      organizationId: session.user.organizationId,
      name,
      address: address || null,
      kind,
      actorUserId: session.user.id,
    });
    revalidatePath("/tr/admin/properties", "page");
    revalidatePath("/en/admin/properties", "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_NAME_REQUIRED") {
      return { error: "PROPERTY_NAME_REQUIRED" };
    }
    throw error;
  }
}
