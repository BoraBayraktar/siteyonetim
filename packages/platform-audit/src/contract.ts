export type AuditRecordInput = {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export interface AuditServiceContract {
  record(input: AuditRecordInput): Promise<void>;
}
