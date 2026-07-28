import bcrypt from "bcryptjs";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  CreatePartyInput,
  InvitePortalAccessInput,
  ListPartiesInput,
  PaginatedParties,
  PartyServiceContract,
} from "./contract";
import { PartyRepository, PartyRepositoryTx } from "./repository";

export class PartyService implements PartyServiceContract {
  constructor(
    private readonly repository = new PartyRepository(),
    private readonly repositoryTx = new PartyRepositoryTx(),
    private readonly audit = createAuditService(),
  ) {}

  async list(input: ListPartiesInput): Promise<PaginatedParties> {
    const { rows, total } = await this.repository.listPaginated(input);
    return { items: rows, total, page: input.page, pageSize: input.pageSize };
  }

  async create(input: CreatePartyInput) {
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new Error("PARTY_NAME_REQUIRED");
    }

    const created = await this.repository.create({ ...input, displayName });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "party.create",
      entityType: "Party",
      entityId: created.id,
      metadata: { displayName },
    });

    return created;
  }

  async invitePortalAccess(input: InvitePortalAccessInput) {
    const email = input.email.trim();
    const password = input.password;
    const name = input.name.trim();
    if (!email || !password || password.length < 8) {
      throw new Error("PORTAL_INVITE_INVALID");
    }
    if (!name) {
      throw new Error("PORTAL_NAME_REQUIRED");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await this.repositoryTx.invitePortal(input, passwordHash);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "party.portal_invite",
      entityType: "Party",
      entityId: updated.id,
      metadata: { email },
    });

    return updated;
  }
}

export function createPartyService(): PartyService {
  return new PartyService();
}
