"use server";

import { OutboxChannel } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canMutateAdminData } from "@/lib/auth-context";
import { getNotificationService } from "@/lib/services";

export type NotificationActionState = { error?: string; success?: boolean; enqueued?: number; processed?: number };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

function parseChannels(formData: FormData): OutboxChannel[] {
  const channels: OutboxChannel[] = [];
  if (formData.get("channelEmail") === "on") {
    channels.push(OutboxChannel.EMAIL);
  }
  if (formData.get("channelSms") === "on") {
    channels.push(OutboxChannel.SMS);
  }
  if (formData.get("channelWhatsApp") === "on") {
    channels.push(OutboxChannel.WHATSAPP);
  }
  return channels;
}

export async function enqueueAnnouncementNotificationsAction(
  locale: string,
  propertyId: string,
  _prev: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const session = await requireAdmin();
  if (!session || !canMutateAdminData(session)) {
    return { error: "UNAUTHORIZED" };
  }

  const announcementId = String(formData.get("announcementId") ?? "");
  const channels = parseChannels(formData);
  const processNow = formData.get("processNow") === "on";

  try {
    const { enqueued } = await getNotificationService().enqueueAnnouncementNotifications({
      organizationId: session.user.organizationId,
      propertyId,
      announcementId,
      channels,
      actorUserId: session.user.id,
    });

    if (processNow) {
      await getNotificationService().processPending({
        organizationId: session.user.organizationId,
        propertyId,
        limit: 50,
      });
    }

    revalidatePath(`/${locale}/admin/properties/${propertyId}/announcements`, "page");
    revalidatePath(`/${locale}/admin/properties/${propertyId}/notifications`, "page");
    return { success: true, enqueued };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function processOutboxAction(
  locale: string,
  propertyId: string,
  _prev: NotificationActionState,
  _formData?: FormData,
): Promise<NotificationActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "UNAUTHORIZED" };
  }

  try {
    const result = await getNotificationService().processPending({
      organizationId: session.user.organizationId,
      propertyId,
      limit: 50,
    });
    revalidatePath(`/${locale}/admin/properties/${propertyId}/notifications`, "page");
    return { success: true, processed: result.processed, enqueued: result.sent };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
