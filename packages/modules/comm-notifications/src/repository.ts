import { AnnouncementAudience, OrganizationRole, OutboxChannel, OutboxStatus, prisma } from "@siteyonetim/db";
import { ANNOUNCEMENT_BODY_FORMAT, stripAnnouncementHtml, type AnnouncementDto } from "@siteyonetim/comm-announcements";

import type { ListOutboxInput, OutboxMessageDto } from "./contract";

const activeOccupancyWhere = {
  deleted: false,
  OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
};

export type AnnouncementRecipient = {
  partyId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  communicationConsent: boolean;
};

function toDto(row: {
  id: string;
  organizationId: string;
  propertyId: string | null;
  channel: OutboxChannel;
  status: OutboxStatus;
  recipient: string;
  subject: string | null;
  body: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  costMinor: number | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: Date;
  sentAt: Date | null;
}): OutboxMessageDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    propertyId: row.propertyId,
    channel: row.channel,
    status: row.status,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError,
    costMinor: row.costMinor,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
  };
}

export class NotificationRepository {
  async listOutbox(input: ListOutboxInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      deleted: false,
    };
    const [rows, total] = await Promise.all([
      prisma.outboxMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.outboxMessage.count({ where }),
    ]);
    return { rows: rows.map(toDto), total };
  }

  async markAttemptFailed(id: string, errorMessage: string, maxAttempts: number) {
    const current = await prisma.outboxMessage.findUnique({ where: { id } });
    if (!current) {
      return;
    }
    const attemptsAfter = current.attempts + 1;
    await prisma.outboxMessage.update({
      where: { id },
      data: {
        attempts: attemptsAfter,
        lastError: errorMessage,
        status: attemptsAfter >= maxAttempts ? OutboxStatus.FAILED : OutboxStatus.PENDING,
      },
    });
  }

  async findPendingBatch(organizationId: string, propertyId: string | null | undefined, limit: number) {
    const rows = await prisma.outboxMessage.findMany({
      where: {
        organizationId,
        ...(propertyId ? { propertyId } : {}),
        status: OutboxStatus.PENDING,
        deleted: false,
      },
      orderBy: { createdAt: "asc" },
      take: limit * 3,
    });
    return rows.filter((row) => row.attempts < row.maxAttempts).slice(0, limit);
  }

  async markSent(id: string, costMinor: number | null) {
    await prisma.outboxMessage.update({
      where: { id },
      data: {
        status: OutboxStatus.SENT,
        sentAt: new Date(),
        costMinor,
        attempts: { increment: 1 },
        lastError: null,
      },
    });
  }

  async createMessages(
    rows: {
      organizationId: string;
      propertyId: string | null;
      channel: OutboxChannel;
      recipient: string;
      subject: string | null;
      body: string;
      sourceType: string;
      sourceId: string;
    }[],
  ) {
    if (rows.length === 0) {
      return 0;
    }
    const result = await prisma.outboxMessage.createMany({ data: rows });
    return result.count;
  }

  async hasAccrualReminderOutbox(organizationId: string, sourceId: string) {
    const row = await prisma.outboxMessage.findFirst({
      where: {
        organizationId,
        sourceType: "AccrualDraftReminder",
        sourceId,
        deleted: false,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.SENT] },
      },
    });
    return Boolean(row);
  }

  async hasAuditorQuarterReminderOutbox(organizationId: string, sourceId: string) {
    const row = await prisma.outboxMessage.findFirst({
      where: {
        organizationId,
        sourceType: "AuditorQuarterReminder",
        sourceId,
        deleted: false,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.SENT] },
      },
    });
    return Boolean(row);
  }

  async findUserEmail(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted: false },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  async hasReportExportReadyOutbox(organizationId: string, exportId: string) {
    const row = await prisma.outboxMessage.findFirst({
      where: {
        organizationId,
        sourceType: "ReportExportReady",
        sourceId: exportId,
        deleted: false,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.SENT] },
      },
    });
    return Boolean(row);
  }

  async findOrgNotifierEmails(organizationId: string) {
    const memberships = await prisma.userOrganization.findMany({
      where: {
        organizationId,
        role: { in: [OrganizationRole.ORG_ADMIN, OrganizationRole.PROPERTY_MANAGER, OrganizationRole.ACCOUNTANT] },
        user: { deleted: false },
      },
      include: { user: { select: { email: true, name: true } } },
    });
    const emails = new Set<string>();
    for (const m of memberships) {
      if (m.user.email) emails.add(m.user.email);
    }
    return [...emails];
  }

  async findAnnouncementRecipients(announcement: AnnouncementDto): Promise<AnnouncementRecipient[]> {
    const occupancies = await prisma.occupancy.findMany({
      where: {
        ...activeOccupancyWhere,
        unit: {
          propertyId: announcement.propertyId,
          deleted: false,
        },
      },
      include: {
        party: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            communicationConsent: true,
            deleted: true,
          },
        },
        unit: { select: { id: true, blockId: true } },
      },
    });

    const byParty = new Map<string, AnnouncementRecipient>();

    for (const occ of occupancies) {
      if (occ.party.deleted) {
        continue;
      }
      if (!matchesAnnouncementAudience(announcement, occ.unit.id, occ.unit.blockId)) {
        continue;
      }
      if (!byParty.has(occ.party.id)) {
        byParty.set(occ.party.id, {
          partyId: occ.party.id,
          displayName: occ.party.displayName,
          email: occ.party.email,
          phone: occ.party.phone,
          communicationConsent: occ.party.communicationConsent,
        });
      }
    }

    return [...byParty.values()];
  }
}

function matchesAnnouncementAudience(
  announcement: AnnouncementDto,
  unitId: string,
  blockId: string | null,
): boolean {
  if (announcement.audience === AnnouncementAudience.PROPERTY_ALL) {
    return true;
  }
  if (announcement.audience === AnnouncementAudience.BLOCK) {
    return Boolean(announcement.blockId && blockId === announcement.blockId);
  }
  if (announcement.audience === AnnouncementAudience.UNITS) {
    return announcement.unitIds.includes(unitId);
  }
  return false;
}

function truncateSms(text: string, max = 320): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1)}…`;
}

function announcementPlainBody(announcement: AnnouncementDto): string {
  if (announcement.bodyFormat === ANNOUNCEMENT_BODY_FORMAT.HTML) {
    return stripAnnouncementHtml(announcement.body);
  }
  return announcement.body;
}

export function buildOutboxRowsForAnnouncement(
  announcement: AnnouncementDto,
  organizationId: string,
  recipients: AnnouncementRecipient[],
  channels: OutboxChannel[],
  whatsApp?: { templateName: string; templateLanguage: string },
) {
  const rows: {
    organizationId: string;
    propertyId: string;
    channel: OutboxChannel;
    recipient: string;
    subject: string | null;
    body: string;
    sourceType: string;
    sourceId: string;
  }[] = [];

  const plainBody = announcementPlainBody(announcement);

  for (const recipient of recipients) {
    if (!recipient.communicationConsent) {
      continue;
    }
    for (const channel of channels) {
      if (channel === OutboxChannel.EMAIL && recipient.email) {
        rows.push({
          organizationId,
          propertyId: announcement.propertyId,
          channel,
          recipient: recipient.email,
          subject: announcement.title,
          body: plainBody,
          sourceType: "Announcement",
          sourceId: announcement.id,
        });
      }
      if (channel === OutboxChannel.SMS && recipient.phone) {
        rows.push({
          organizationId,
          propertyId: announcement.propertyId,
          channel,
          recipient: recipient.phone,
          subject: null,
          body: truncateSms(`${announcement.title}: ${plainBody}`),
          sourceType: "Announcement",
          sourceId: announcement.id,
        });
      }
      if (channel === OutboxChannel.WHATSAPP && recipient.phone && whatsApp) {
        rows.push({
          organizationId,
          propertyId: announcement.propertyId,
          channel,
          recipient: recipient.phone,
          subject: announcement.title,
          body: truncateSms(plainBody, 900),
          sourceType: "Announcement",
          sourceId: announcement.id,
        });
      }
    }
  }

  return rows;
}

export function buildAccrualDraftReminderRows(input: {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  year: number;
  month: number;
  draftRunCount: number;
  recipientEmails: string[];
  appBaseUrl: string;
}) {
  const sourceId = `${input.propertyId}:${input.year}:${input.month}`;
  const path = `/tr/admin/properties/${input.propertyId}/dues`;
  const link = input.appBaseUrl ? `${input.appBaseUrl.replace(/\/$/, "")}${path}` : path;
  const subject = `Tahakkuk kesinleştirme — ${input.propertyName} (${input.month}/${input.year})`;
  const body = [
    `${input.propertyName} apartmanı için ${input.month}/${input.year} döneminde ${input.draftRunCount} adet taslak (DRAFT) tahakkuk bekliyor.`,
    "Lütfen aidat ekranından kontrol edip kesinleştirin.",
    `Bağlantı: ${link}`,
  ].join("\n\n");

  return input.recipientEmails.map((email) => ({
    organizationId: input.organizationId,
    propertyId: input.propertyId,
    channel: OutboxChannel.EMAIL,
    recipient: email,
    subject,
    body,
    sourceType: "AccrualDraftReminder",
    sourceId,
  }));
}

export function buildReportExportReadyRows(input: {
  organizationId: string;
  propertyId: string;
  exportId: string;
  reportKind: string;
  year: number;
  month: number;
  recipientEmail: string;
  appBaseUrl: string;
  locale?: string;
}) {
  const loc = input.locale === "en" ? "en" : "tr";
  const path = `/${loc}/admin/properties/${input.propertyId}/reports`;
  const downloadPath = `/api/reports/exports/${input.exportId}/download`;
  const base = input.appBaseUrl.replace(/\/$/, "");
  const reportsLink = base ? `${base}${path}` : path;
  const downloadLink = base ? `${base}${downloadPath}` : downloadPath;
  const subject =
    loc === "en"
      ? `Report export ready — ${input.reportKind} (${input.month}/${input.year})`
      : `Rapor dışa aktarımı hazır — ${input.reportKind} (${input.month}/${input.year})`;
  const body =
    loc === "en"
      ? [
          `Your ${input.reportKind} export for ${input.month}/${input.year} is ready.`,
          `Reports page: ${reportsLink}`,
          `Download (while signed in): ${downloadLink}`,
        ].join("\n\n")
      : [
          `${input.month}/${input.year} dönemi ${input.reportKind} rapor dışa aktarımınız hazır.`,
          `Raporlar: ${reportsLink}`,
          `İndirme (oturum açıkken): ${downloadLink}`,
        ].join("\n\n");

  return [
    {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      channel: OutboxChannel.EMAIL,
      recipient: input.recipientEmail,
      subject,
      body,
      sourceType: "ReportExportReady",
      sourceId: input.exportId,
    },
  ];
}

export function buildAuditorQuarterReminderRows(input: {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  assignmentId: string;
  auditorEmail: string;
  auditorName: string;
  year: number;
  period: string;
  reportStatus: string | null;
  appBaseUrl: string;
  locale?: string;
}) {
  const loc = input.locale === "en" ? "en" : "tr";
  const sourceId = `${input.assignmentId}:${input.year}:${input.period}`;
  const path = `/${loc}/auditor/properties/${input.propertyId}/reports/audit/${input.assignmentId}`;
  const link = input.appBaseUrl ? `${input.appBaseUrl.replace(/\/$/, "")}${path}` : path;
  const periodLabel = loc === "en" ? `${input.period} ${input.year}` : `${input.year} ${input.period}`;
  const statusHint =
    input.reportStatus == null
      ? loc === "en"
        ? "No draft has been started yet."
        : "Henüz taslak oluşturulmadı."
      : loc === "en"
        ? `Current report status: ${input.reportStatus}.`
        : `Mevcut rapor durumu: ${input.reportStatus}.`;

  const subject =
    loc === "en"
      ? `Quarterly audit reminder — ${input.propertyName} (${periodLabel})`
      : `Çeyreklik denetim hatırlatması — ${input.propertyName} (${periodLabel})`;

  const body =
    loc === "en"
      ? [
          `Hello ${input.auditorName},`,
          `This is a reminder to complete your auditor report for ${input.propertyName} (${periodLabel}).`,
          statusHint,
          `Open the report editor: ${link}`,
        ].join("\n\n")
      : [
          `Merhaba ${input.auditorName},`,
          `${input.propertyName} için ${periodLabel} dönem denetçi raporunuzu tamamlamanız gerekmektedir.`,
          statusHint,
          `Rapor editörü: ${link}`,
        ].join("\n\n");

  return [
    {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      channel: OutboxChannel.EMAIL,
      recipient: input.auditorEmail,
      subject,
      body,
      sourceType: "AuditorQuarterReminder",
      sourceId,
    },
  ];
}
