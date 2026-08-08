import type { OutboxChannel, OutboxStatus } from "@siteyonetim/db";

export type OutboxMessageDto = {
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
};

export type ListOutboxInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
};

export type PaginatedOutbox = {
  items: OutboxMessageDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type EnqueueAnnouncementNotificationsInput = {
  organizationId: string;
  propertyId: string;
  announcementId: string;
  channels: OutboxChannel[];
  actorUserId?: string | null;
};

export type ProcessOutboxInput = {
  organizationId: string;
  propertyId?: string | null;
  limit?: number;
};

export type ProcessOutboxResult = {
  processed: number;
  sent: number;
  failed: number;
};

export type EnqueueAccrualDraftReminderInput = {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  year: number;
  month: number;
  draftRunCount: number;
  channels?: OutboxChannel[];
  actorUserId?: string | null;
};

export type EnqueueMeterReadingReminderInput = {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  year: number;
  month: number;
  missingReadingCount: number;
  meterKinds: string[];
  actorUserId?: string | null;
};

export type EnqueueReportExportReadyInput = {
  organizationId: string;
  propertyId: string;
  exportId: string;
  reportKind: string;
  year: number;
  month: number;
  requestedByUserId?: string | null;
  actorUserId?: string | null;
};

export type EnqueueAuditorQuarterReminderInput = {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  assignmentId: string;
  auditorUserId: string;
  auditorEmail: string;
  auditorName: string;
  year: number;
  period: string;
  reportStatus: string | null;
  actorUserId?: string | null;
  locale?: string;
};

export interface NotificationServiceContract {
  listOutbox(input: ListOutboxInput): Promise<PaginatedOutbox>;
  enqueueAnnouncementNotifications(input: EnqueueAnnouncementNotificationsInput): Promise<{ enqueued: number }>;
  enqueueAccrualDraftReminder(input: EnqueueAccrualDraftReminderInput): Promise<{ enqueued: number }>;
  enqueueMeterReadingReminder(input: EnqueueMeterReadingReminderInput): Promise<{ enqueued: number }>;
  enqueueAuditorQuarterReminder(input: EnqueueAuditorQuarterReminderInput): Promise<{ enqueued: number }>;
  enqueueReportExportReady(input: EnqueueReportExportReadyInput): Promise<{ enqueued: number }>;
  processPending(input: ProcessOutboxInput): Promise<ProcessOutboxResult>;
}
