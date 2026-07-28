import type { AuditRecordInput, AuditServiceContract } from "./contract";
import { AuditRepository } from "./repository";

export class AuditService implements AuditServiceContract {
  constructor(private readonly repository = new AuditRepository()) {}

  async record(input: AuditRecordInput): Promise<void> {
    await this.repository.create(input);
  }
}

export function createAuditService(): AuditService {
  return new AuditService();
}
