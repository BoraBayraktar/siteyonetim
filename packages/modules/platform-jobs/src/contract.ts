import type { JobRunStatus, JobType } from "@siteyonetim/db";

export type RunMonthlyJobInput = {
  year: number;
  month: number;
  actorUserId?: string | null;
};

export type RunLateFeeMonthlyInput = RunMonthlyJobInput;
export type RunDueAccrualMonthlyInput = RunMonthlyJobInput;
export type RunAccrualDraftReminderInput = RunMonthlyJobInput;

export type AccrualReminderPropertyResult = {
  organizationId: string;
  propertyId: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  enqueued?: number;
  error?: string;
};

export type RunAccrualDraftReminderResult = {
  year: number;
  month: number;
  properties: AccrualReminderPropertyResult[];
  outbox: { processed: number; sent: number; failed: number };
};

export type JobPropertyResult = {
  organizationId: string;
  propertyId: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  dueDefinitionId?: string;
  added?: number;
  runId?: string | null;
  lineCount?: number;
  error?: string;
};

export type LateFeeJobPropertyResult = JobPropertyResult;
export type DueAccrualJobPropertyResult = JobPropertyResult;

export type RunLateFeeMonthlyResult = {
  year: number;
  month: number;
  results: LateFeeJobPropertyResult[];
};

export type RunDueAccrualMonthlyResult = {
  year: number;
  month: number;
  results: DueAccrualJobPropertyResult[];
};

export type JobRunDto = {
  id: string;
  jobType: JobType;
  idempotencyKey: string;
  organizationId: string | null;
  propertyId: string | null;
  year: number | null;
  month: number | null;
  status: JobRunStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
};

export interface JobServiceContract {
  runLateFeeMonthly(input: RunLateFeeMonthlyInput): Promise<RunLateFeeMonthlyResult>;
  runDueAccrualMonthly(input: RunDueAccrualMonthlyInput): Promise<RunDueAccrualMonthlyResult>;
  runAccrualDraftReminders(input: RunAccrualDraftReminderInput): Promise<RunAccrualDraftReminderResult>;
}
