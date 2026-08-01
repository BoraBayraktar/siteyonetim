import { JobRunStatus, JobType } from "@siteyonetim/db";
import type { NotificationServiceContract } from "@siteyonetim/comm-notifications";
import { createNotificationService } from "@siteyonetim/comm-notifications";
import type { DuesServiceContract } from "@siteyonetim/finance-dues";
import { createDuesService } from "@siteyonetim/finance-dues";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  AccrualReminderPropertyResult,
  DueAccrualJobPropertyResult,
  JobServiceContract,
  LateFeeJobPropertyResult,
  RunAccrualDraftReminderInput,
  RunAccrualDraftReminderResult,
  RunDueAccrualMonthlyInput,
  RunDueAccrualMonthlyResult,
  RunLateFeeMonthlyInput,
  RunLateFeeMonthlyResult,
} from "./contract";
import { isSkippableAccrualJobError } from "./accrual-errors";
import { JobRepository } from "./repository";

export class JobService implements JobServiceContract {
  private readonly repository = new JobRepository();
  private readonly dues: DuesServiceContract;
  private readonly notifications: NotificationServiceContract;
  private readonly audit = createAuditService();

  constructor(
    dues: DuesServiceContract = createDuesService(),
    notifications: NotificationServiceContract = createNotificationService(),
  ) {
    this.dues = dues;
    this.notifications = notifications;
  }

  async runLateFeeMonthly(input: RunLateFeeMonthlyInput): Promise<RunLateFeeMonthlyResult> {
    const targets = await this.dues.listActiveLateFeePolicyTargets();
    const results: LateFeeJobPropertyResult[] = [];

    for (const target of targets) {
      const idempotencyKey = `LATE_FEE_MONTHLY:${target.propertyId}:${input.year}:${input.month}`;
      const row = await this.executeJob({
        jobType: JobType.LATE_FEE_MONTHLY,
        idempotencyKey,
        organizationId: target.organizationId,
        propertyId: target.propertyId,
        year: input.year,
        month: input.month,
        run: async () => {
          const applied = await this.dues.applyLateFees({
            organizationId: target.organizationId,
            propertyId: target.propertyId,
            year: input.year,
            month: input.month,
            actorUserId: input.actorUserId ?? null,
          });
          return {
            resultJson: applied,
            success: { added: applied.added, runId: applied.runId },
          };
        },
      });
      results.push({
        organizationId: target.organizationId,
        propertyId: target.propertyId,
        status: row.status,
        added: row.added,
        runId: row.runId,
        error: row.error,
      });
    }

    await this.auditJobBatch("jobs.lateFeeMonthly.run", input, results);
    return { year: input.year, month: input.month, results };
  }

  async runDueAccrualMonthly(input: RunDueAccrualMonthlyInput): Promise<RunDueAccrualMonthlyResult> {
    const targets = await this.dues.listAutoAccrualDefinitionTargets();
    const results: DueAccrualJobPropertyResult[] = [];

    for (const target of targets) {
      const idempotencyKey = `DUE_ACCRUAL_MONTHLY:${target.propertyId}:${target.dueDefinitionId}:${input.year}:${input.month}`;
      const row = await this.executeJob({
        jobType: JobType.DUE_ACCRUAL_MONTHLY,
        idempotencyKey,
        organizationId: target.organizationId,
        propertyId: target.propertyId,
        year: input.year,
        month: input.month,
        run: async () => {
          try {
            const generated = await this.dues.generateAccrual({
              organizationId: target.organizationId,
              propertyId: target.propertyId,
              dueDefinitionId: target.dueDefinitionId,
              year: input.year,
              month: input.month,
              actorUserId: input.actorUserId ?? null,
            });
            return {
              resultJson: generated,
              success: { runId: generated.id, lineCount: generated.lineCount },
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : "JOB_FAILED";
            if (isSkippableAccrualJobError(message)) {
              return { skip: message };
            }
            throw error;
          }
        },
      });
      results.push({
        organizationId: target.organizationId,
        propertyId: target.propertyId,
        dueDefinitionId: target.dueDefinitionId,
        status: row.status,
        runId: row.runId,
        lineCount: row.lineCount,
        error: row.error,
      });
    }

    await this.auditJobBatch("jobs.dueAccrualMonthly.run", input, results);
    return { year: input.year, month: input.month, results };
  }

  async runAccrualDraftReminders(input: RunAccrualDraftReminderInput): Promise<RunAccrualDraftReminderResult> {
    const targets = await this.dues.listDraftAccrualReminderTargets(input.year, input.month);
    const properties: AccrualReminderPropertyResult[] = [];

    for (const target of targets) {
      const idempotencyKey = `ACCRUAL_DRAFT_REMINDER:${target.propertyId}:${input.year}:${input.month}`;
      const existing = await this.repository.findByIdempotencyKey(idempotencyKey);
      if (existing?.status === JobRunStatus.SUCCEEDED) {
        properties.push({
          organizationId: target.organizationId,
          propertyId: target.propertyId,
          status: "SKIPPED",
        });
        continue;
      }

      const run =
        existing != null
          ? await this.repository.restartRun(existing.id)
          : await this.repository.createRun({
              jobType: JobType.ACCRUAL_DRAFT_REMINDER,
              idempotencyKey,
              organizationId: target.organizationId,
              propertyId: target.propertyId,
              year: input.year,
              month: input.month,
            });

      try {
        const { enqueued } = await this.notifications.enqueueAccrualDraftReminder({
          organizationId: target.organizationId,
          propertyId: target.propertyId,
          propertyName: target.propertyName,
          year: target.year,
          month: target.month,
          draftRunCount: target.draftRunCount,
          actorUserId: input.actorUserId ?? null,
        });
        await this.repository.finishRun(run.id, JobRunStatus.SUCCEEDED, { enqueued });
        properties.push({
          organizationId: target.organizationId,
          propertyId: target.propertyId,
          status: enqueued > 0 ? "SUCCEEDED" : "SKIPPED",
          enqueued,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "JOB_FAILED";
        if (message === "NOTIFICATION_NO_RECIPIENTS") {
          await this.repository.finishRun(run.id, JobRunStatus.SUCCEEDED, { skipped: message });
          properties.push({
            organizationId: target.organizationId,
            propertyId: target.propertyId,
            status: "SKIPPED",
            error: message,
          });
          continue;
        }
        await this.repository.finishRun(run.id, JobRunStatus.FAILED, undefined, message);
        properties.push({
          organizationId: target.organizationId,
          propertyId: target.propertyId,
          status: "FAILED",
          error: message,
        });
      }
    }

    const orgIds = [...new Set(properties.map((p) => p.organizationId))];
    let processed = 0;
    let sent = 0;
    let failed = 0;
    for (const organizationId of orgIds) {
      const result = await this.notifications.processPending({ organizationId, limit: 50 });
      processed += result.processed;
      sent += result.sent;
      failed += result.failed;
    }

    await this.auditJobBatch("jobs.accrualDraftReminder.run", input, properties);

    return {
      year: input.year,
      month: input.month,
      properties,
      outbox: { processed, sent, failed },
    };
  }

  private async executeJob(input: {
    jobType: JobType;
    idempotencyKey: string;
    organizationId: string;
    propertyId: string;
    year: number;
    month: number;
    run: () => Promise<
      | { resultJson: unknown; success: { added?: number; runId?: string | null; lineCount?: number } }
      | { skip: string }
    >;
  }): Promise<{
    status: "SUCCEEDED" | "FAILED" | "SKIPPED";
    added?: number;
    runId?: string | null;
    lineCount?: number;
    error?: string;
  }> {
    const existing = await this.repository.findByIdempotencyKey(input.idempotencyKey);
    if (existing?.status === JobRunStatus.SUCCEEDED) {
      return { status: "SKIPPED" };
    }

    const run =
      existing != null
        ? await this.repository.restartRun(existing.id)
        : await this.repository.createRun({
            jobType: input.jobType,
            idempotencyKey: input.idempotencyKey,
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            year: input.year,
            month: input.month,
          });

    try {
      const outcome = await input.run();
      if ("skip" in outcome) {
        await this.repository.finishRun(run.id, JobRunStatus.SUCCEEDED, { skipped: true, reason: outcome.skip });
        return { status: "SKIPPED", error: outcome.skip };
      }
      await this.repository.finishRun(run.id, JobRunStatus.SUCCEEDED, outcome.resultJson as object);
      return {
        status: "SUCCEEDED",
        added: outcome.success.added,
        runId: outcome.success.runId ?? null,
        lineCount: outcome.success.lineCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "JOB_FAILED";
      await this.repository.finishRun(run.id, JobRunStatus.FAILED, undefined, message);
      return { status: "FAILED", error: message };
    }
  }

  private async auditJobBatch(
    action: string,
    input: { year: number; month: number; actorUserId?: string | null },
    results: { organizationId: string; status: string }[],
  ) {
    const byOrg = new Map<string, typeof results>();
    for (const row of results) {
      const list = byOrg.get(row.organizationId) ?? [];
      list.push(row);
      byOrg.set(row.organizationId, list);
    }
    for (const [organizationId, orgResults] of byOrg) {
      await this.audit.record({
        organizationId,
        userId: input.actorUserId,
        action,
        entityType: "JobRun",
        metadata: {
          year: input.year,
          month: input.month,
          itemCount: orgResults.length,
          succeeded: orgResults.filter((r) => r.status === "SUCCEEDED").length,
          failed: orgResults.filter((r) => r.status === "FAILED").length,
          skipped: orgResults.filter((r) => r.status === "SKIPPED").length,
        },
      });
    }
  }
}

export function createJobService(
  dues?: DuesServiceContract,
  notifications?: NotificationServiceContract,
): JobService {
  return new JobService(dues, notifications);
}
