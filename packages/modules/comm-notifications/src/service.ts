import { OutboxChannel } from "@siteyonetim/db";
import type { AnnouncementServiceContract } from "@siteyonetim/comm-announcements";
import { createAnnouncementService } from "@siteyonetim/comm-announcements";
import type { PropertySettingsServiceContract } from "@siteyonetim/property-settings";
import { createPropertySettingsService } from "@siteyonetim/property-settings";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  EnqueueAccrualDraftReminderInput,
  EnqueueAnnouncementNotificationsInput,
  EnqueueAuditorQuarterReminderInput,
  EnqueueMeterReadingReminderInput,
  EnqueueReportExportReadyInput,
  ListOutboxInput,
  NotificationServiceContract,
  PaginatedOutbox,
  ProcessOutboxInput,
  ProcessOutboxResult,
} from "./contract";
import {
  createEmailProvider,
  createSmsProvider,
  createWhatsAppProvider,
  type EmailProvider,
  type SmsProvider,
  type WhatsAppProvider,
} from "./providers";
import {
  buildAccrualDraftReminderRows,
  buildAuditorQuarterReminderRows,
  buildMeterReadingReminderRows,
  buildOutboxRowsForAnnouncement,
  buildReportExportReadyRows,
  NotificationRepository,
} from "./repository";

export class NotificationService implements NotificationServiceContract {
  constructor(
    private readonly repository = new NotificationRepository(),
    private readonly announcementService: AnnouncementServiceContract = createAnnouncementService(),
    private readonly propertySettings: PropertySettingsServiceContract = createPropertySettingsService(),
    private readonly audit = createAuditService(),
    private readonly emailProvider: EmailProvider = createEmailProvider(),
    private readonly smsProvider: SmsProvider = createSmsProvider(),
    private readonly whatsAppProvider: WhatsAppProvider = createWhatsAppProvider(),
  ) {}

  async listOutbox(input: ListOutboxInput): Promise<PaginatedOutbox> {
    const { rows, total } = await this.repository.listOutbox(input);
    return {
      items: rows,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async enqueueAnnouncementNotifications(
    input: EnqueueAnnouncementNotificationsInput,
  ): Promise<{ enqueued: number }> {
    const channels = [...new Set(input.channels)];
    if (channels.length === 0) {
      throw new Error("NOTIFICATION_CHANNELS_REQUIRED");
    }

    let whatsAppConfig: { templateName: string; templateLanguage: string } | undefined;
    if (channels.includes(OutboxChannel.WHATSAPP)) {
      const profile = await this.propertySettings.getWhatsAppProfile(input.organizationId, input.propertyId);
      if (!profile?.enabled) {
        throw new Error("WHATSAPP_NOT_CONFIGURED");
      }
      const phoneNumberId = await this.propertySettings.resolveWhatsAppPhoneNumberId(
        input.organizationId,
        input.propertyId,
      );
      if (!phoneNumberId) {
        throw new Error("WHATSAPP_NOT_CONFIGURED");
      }
      whatsAppConfig = {
        templateName: profile.templateName,
        templateLanguage: profile.templateLanguage,
      };
    }

    const announcement = await this.announcementService.getById({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      announcementId: input.announcementId,
    });
    if (!announcement) {
      throw new Error("ANNOUNCEMENT_NOT_FOUND");
    }

    const recipients = await this.repository.findAnnouncementRecipients(announcement);
    const rows = buildOutboxRowsForAnnouncement(
      announcement,
      input.organizationId,
      recipients,
      channels,
      whatsAppConfig,
    );
    if (rows.length === 0) {
      throw new Error("NOTIFICATION_NO_RECIPIENTS");
    }

    const enqueued = await this.repository.createMessages(rows);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "notification.enqueue",
      entityType: "Announcement",
      entityId: input.announcementId,
      metadata: { channels, enqueued, propertyId: input.propertyId },
    });

    return { enqueued };
  }

  async enqueueAccrualDraftReminder(input: EnqueueAccrualDraftReminderInput): Promise<{ enqueued: number }> {
    const sourceId = `${input.propertyId}:${input.year}:${input.month}`;
    const already = await this.repository.hasAccrualReminderOutbox(input.organizationId, sourceId);
    if (already) {
      return { enqueued: 0 };
    }

    const emails = await this.repository.findOrgNotifierEmails(input.organizationId);
    if (emails.length === 0) {
      throw new Error("NOTIFICATION_NO_RECIPIENTS");
    }

    const rows = buildAccrualDraftReminderRows({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      propertyName: input.propertyName,
      year: input.year,
      month: input.month,
      draftRunCount: input.draftRunCount,
      recipientEmails: emails,
      appBaseUrl: process.env.APP_URL ?? "",
    });

    const enqueued = await this.repository.createMessages(rows);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "notification.accrualDraftReminder.enqueue",
      entityType: "Property",
      entityId: input.propertyId,
      metadata: { year: input.year, month: input.month, enqueued, draftRunCount: input.draftRunCount },
    });

    return { enqueued };
  }

  async enqueueMeterReadingReminder(input: EnqueueMeterReadingReminderInput): Promise<{ enqueued: number }> {
    const sourceId = `${input.propertyId}:${input.year}:${input.month}`;
    const already = await this.repository.hasMeterReadingReminderOutbox(input.organizationId, sourceId);
    if (already) {
      return { enqueued: 0 };
    }

    const emails = await this.repository.findOrgNotifierEmails(input.organizationId);
    if (emails.length === 0) {
      throw new Error("NOTIFICATION_NO_RECIPIENTS");
    }

    const rows = buildMeterReadingReminderRows({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      propertyName: input.propertyName,
      year: input.year,
      month: input.month,
      missingReadingCount: input.missingReadingCount,
      meterKinds: input.meterKinds,
      recipientEmails: emails,
      appBaseUrl: process.env.APP_URL ?? "",
    });

    const enqueued = await this.repository.createMessages(rows);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "notification.meterReadingReminder.enqueue",
      entityType: "Property",
      entityId: input.propertyId,
      metadata: {
        year: input.year,
        month: input.month,
        enqueued,
        missingReadingCount: input.missingReadingCount,
        meterKinds: input.meterKinds,
      },
    });

    return { enqueued };
  }

  async enqueueAuditorQuarterReminder(input: EnqueueAuditorQuarterReminderInput): Promise<{ enqueued: number }> {
    const sourceId = `${input.assignmentId}:${input.year}:${input.period}`;
    const already = await this.repository.hasAuditorQuarterReminderOutbox(input.organizationId, sourceId);
    if (already) {
      return { enqueued: 0 };
    }

    if (!input.auditorEmail.trim()) {
      throw new Error("NOTIFICATION_NO_RECIPIENTS");
    }

    const rows = buildAuditorQuarterReminderRows({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      propertyName: input.propertyName,
      assignmentId: input.assignmentId,
      auditorEmail: input.auditorEmail,
      auditorName: input.auditorName,
      year: input.year,
      period: input.period,
      reportStatus: input.reportStatus,
      appBaseUrl: process.env.APP_URL ?? "",
      locale: input.locale,
    });

    const enqueued = await this.repository.createMessages(rows);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "notification.auditorQuarterReminder.enqueue",
      entityType: "AuditorAssignment",
      entityId: input.assignmentId,
      metadata: {
        propertyId: input.propertyId,
        year: input.year,
        period: input.period,
        enqueued,
        auditorUserId: input.auditorUserId,
      },
    });

    return { enqueued };
  }

  async enqueueReportExportReady(input: EnqueueReportExportReadyInput): Promise<{ enqueued: number }> {
    const already = await this.repository.hasReportExportReadyOutbox(input.organizationId, input.exportId);
    if (already) {
      return { enqueued: 0 };
    }

    let email: string | null = null;
    if (input.requestedByUserId) {
      email = await this.repository.findUserEmail(input.requestedByUserId);
    }
    if (!email) {
      const fallbacks = await this.repository.findOrgNotifierEmails(input.organizationId);
      email = fallbacks[0] ?? null;
    }
    if (!email) {
      return { enqueued: 0 };
    }

    const rows = buildReportExportReadyRows({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      exportId: input.exportId,
      reportKind: input.reportKind,
      year: input.year,
      month: input.month,
      recipientEmail: email,
      appBaseUrl: process.env.APP_URL ?? "",
    });

    const enqueued = await this.repository.createMessages(rows);
    if (enqueued > 0) {
      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "notification.reportExportReady.enqueue",
        entityType: "ReportExport",
        entityId: input.exportId,
        metadata: { propertyId: input.propertyId, reportKind: input.reportKind },
      });
    }
    return { enqueued };
  }

  async processPending(input: ProcessOutboxInput): Promise<ProcessOutboxResult> {
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    const batch = await this.repository.findPendingBatch(input.organizationId, input.propertyId, limit);

    let sent = 0;
    let failed = 0;

    const whatsAppByProperty = new Map<
      string,
      { phoneNumberId: string; templateName: string; templateLanguage: string } | null
    >();

    for (const message of batch) {
      try {
        let costMinor: number | undefined;
        if (message.channel === OutboxChannel.EMAIL) {
          const result = await this.emailProvider.send({
            to: message.recipient,
            subject: message.subject ?? "",
            body: message.body,
          });
          costMinor = result.costMinor;
        } else if (message.channel === OutboxChannel.SMS) {
          const result = await this.smsProvider.send({
            to: message.recipient,
            body: message.body,
          });
          costMinor = result.costMinor;
        } else if (message.channel === OutboxChannel.WHATSAPP) {
          const propertyId = message.propertyId;
          if (!propertyId) {
            throw new Error("WHATSAPP_PROPERTY_MISSING");
          }
          let config = whatsAppByProperty.get(propertyId);
          if (config === undefined) {
            const profile = await this.propertySettings.getWhatsAppProfile(input.organizationId, propertyId);
            const phoneNumberId = await this.propertySettings.resolveWhatsAppPhoneNumberId(
              input.organizationId,
              propertyId,
            );
            if (!profile?.enabled || !phoneNumberId) {
              config = null;
            } else {
              config = {
                phoneNumberId,
                templateName: profile.templateName,
                templateLanguage: profile.templateLanguage,
              };
            }
            whatsAppByProperty.set(propertyId, config);
          }
          if (!config) {
            throw new Error("WHATSAPP_NOT_CONFIGURED");
          }
          const result = await this.whatsAppProvider.sendTemplate({
            toPhoneE164: message.recipient,
            phoneNumberId: config.phoneNumberId,
            templateName: config.templateName,
            templateLanguage: config.templateLanguage,
            title: message.subject ?? "",
            body: message.body,
          });
          costMinor = result.costMinor;
        } else {
          throw new Error("UNSUPPORTED_CHANNEL");
        }
        await this.repository.markSent(message.id, costMinor ?? null);
        sent += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "SEND_FAILED";
        await this.repository.markAttemptFailed(message.id, errorMessage, message.maxAttempts);
        failed += 1;
      }
    }

    if (sent > 0 || failed > 0) {
      await this.audit.record({
        organizationId: input.organizationId,
        userId: null,
        action: "notification.process",
        entityType: "OutboxMessage",
        metadata: { sent, failed, propertyId: input.propertyId ?? null },
      });
    }

    return { processed: batch.length, sent, failed };
  }
}

export function createNotificationService(): NotificationService {
  return new NotificationService();
}
