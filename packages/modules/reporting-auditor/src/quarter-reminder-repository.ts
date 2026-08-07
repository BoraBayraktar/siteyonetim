import { AuditorReportPeriod, AuditorReportStatus, prisma } from "@siteyonetim/db";

import type { QuarterPeriod } from "./quarter-reminder";
import { isQuarterPeriod } from "./quarter-reminder";

const notDeleted = { deleted: false };

const REMINDABLE_STATUSES = new Set<AuditorReportStatus>([
  AuditorReportStatus.DRAFT,
  AuditorReportStatus.IN_REVIEW,
]);

export type AuditorQuarterReminderTarget = {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  assignmentId: string;
  auditorUserId: string;
  auditorEmail: string;
  auditorName: string;
  year: number;
  period: QuarterPeriod;
  reportStatus: AuditorReportStatus | null;
};

export class AuditorQuarterReminderRepository {
  async listReminderTargets(year: number, period: QuarterPeriod): Promise<AuditorQuarterReminderTarget[]> {
    if (!isQuarterPeriod(period)) {
      return [];
    }

    const rows = await prisma.auditorAssignment.findMany({
      where: {
        year,
        period: period as AuditorReportPeriod,
        ...notDeleted,
        property: notDeleted,
      },
      include: {
        property: { select: { name: true } },
        reports: {
          where: notDeleted,
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    });

    if (rows.length === 0) {
      return [];
    }

    const auditorIds = [...new Set(rows.map((row) => row.auditorUserId))];
    const auditors = await this.loadAuditorUsers(rows[0].organizationId, auditorIds);

    const targets: AuditorQuarterReminderTarget[] = [];
    for (const row of rows) {
      const latestStatus = row.reports[0]?.status ?? null;
      if (latestStatus != null && !REMINDABLE_STATUSES.has(latestStatus)) {
        continue;
      }

      const auditor = auditors.get(row.auditorUserId);
      if (!auditor?.email) {
        continue;
      }

      targets.push({
        organizationId: row.organizationId,
        propertyId: row.propertyId,
        propertyName: row.property.name,
        assignmentId: row.id,
        auditorUserId: row.auditorUserId,
        auditorEmail: auditor.email,
        auditorName: auditor.name,
        year: row.year,
        period,
        reportStatus: latestStatus,
      });
    }

    return targets;
  }

  private async loadAuditorUsers(organizationId: string, userIds: string[]) {
    const memberships = await prisma.userOrganization.findMany({
      where: {
        organizationId,
        userId: { in: userIds },
        user: notDeleted,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return new Map(
      memberships.map((row) => [
        row.userId,
        { name: row.user.name, email: row.user.email },
      ]),
    );
  }
}
