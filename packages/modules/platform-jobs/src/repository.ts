import { JobRunStatus, JobType, Prisma, prisma } from "@siteyonetim/db";

const notDeleted = { deleted: false };

export class JobRepository {
  async findByIdempotencyKey(key: string) {
    return prisma.jobRun.findFirst({
      where: { idempotencyKey: key, ...notDeleted },
    });
  }

  async createRun(input: {
    jobType: JobType;
    idempotencyKey: string;
    organizationId?: string | null;
    propertyId?: string | null;
    year?: number | null;
    month?: number | null;
  }) {
    return prisma.jobRun.create({
      data: {
        jobType: input.jobType,
        idempotencyKey: input.idempotencyKey,
        organizationId: input.organizationId ?? null,
        propertyId: input.propertyId ?? null,
        year: input.year ?? null,
        month: input.month ?? null,
        status: JobRunStatus.RUNNING,
        startedAt: new Date(),
      },
    });
  }

  async finishRun(
    id: string,
    status: JobRunStatus,
    resultJson?: Prisma.InputJsonValue,
    errorMessage?: string | null,
  ) {
    return prisma.jobRun.update({
      where: { id },
      data: {
        status,
        completedAt: new Date(),
        resultJson: resultJson ?? undefined,
        errorMessage: errorMessage ?? null,
      },
    });
  }

  async restartRun(id: string) {
    return prisma.jobRun.update({
      where: { id },
      data: {
        status: JobRunStatus.RUNNING,
        startedAt: new Date(),
        completedAt: null,
        errorMessage: null,
        resultJson: undefined,
      },
    });
  }
}
