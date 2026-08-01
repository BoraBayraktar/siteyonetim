import bcrypt from "bcryptjs";
import { OrganizationRole } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  CreateOrgUserInput,
  ListOrgUsersInput,
  OrgUserDto,
  RemoveOrgUserInput,
  UpdateOrgUserInput,
} from "./contract";
import { portalKindForOrganizationRole } from "./contract";
import { OrgUsersRepository } from "./org-users.repository";
import { PropertyRbacRepository } from "./repository";

function isOrgWideRole(role: OrganizationRole): boolean {
  return role === OrganizationRole.ORG_ADMIN;
}

function toOrgUserDto(row: {
  userId: string;
  email: string;
  name: string;
  organizationRole: OrganizationRole;
  propertyAccess: OrgUserDto["propertyAccess"];
}): OrgUserDto {
  return {
    ...row,
    portalKind: portalKindForOrganizationRole(row.organizationRole),
  };
}

export class OrgUsersService {
  constructor(
    private readonly orgUsers = new OrgUsersRepository(),
    private readonly propertyRbac = new PropertyRbacRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async listOrgUsers(input: ListOrgUsersInput): Promise<OrgUserDto[]> {
    const rows = await this.orgUsers.listOrgUsers(input.organizationId);
    return rows.map((row) => toOrgUserDto(row));
  }

  async listOrgPropertyOptions(organizationId: string) {
    return this.orgUsers.listPropertyOptions(organizationId);
  }

  async createOrgUser(input: CreateOrgUserInput): Promise<OrgUserDto> {
    if (!this.orgUsers.isAssignableRole(input.organizationRole)) {
      throw new Error("INVALID_ORG_ROLE");
    }

    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!email || !name) throw new Error("INVALID_INPUT");

    let user = await this.orgUsers.findUserByEmail(email);
    if (user) {
      const existingMembership = await this.orgUsers.findUserOrgMembership(user.id, input.organizationId);
      if (existingMembership) {
        throw new Error("USER_ALREADY_IN_ORG");
      }
    } else if (input.password.trim().length < 8) {
      throw new Error("PASSWORD_TOO_SHORT");
    }

    if (!isOrgWideRole(input.organizationRole) && input.propertyIds.length === 0) {
      throw new Error("PROPERTY_SCOPE_REQUIRED");
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(input.password.trim(), 12);
      user = await this.orgUsers.createUser({ email, name, passwordHash });
    }

    await this.orgUsers.upsertMembership(user.id, input.organizationId, input.organizationRole);

    if (isOrgWideRole(input.organizationRole)) {
      await this.orgUsers.clearPropertyAccess(input.organizationId, user.id, input.actorUserId);
    } else {
      await this.propertyRbac.replacePropertyAccessSet({
        userId: user.id,
        organizationId: input.organizationId,
        propertyIds: input.propertyIds,
        role: this.orgUsers.propertyRoleForOrganizationRole(input.organizationRole),
        actorUserId: input.actorUserId,
      });
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "rbac.orgUser.create",
      entityType: "UserOrganization",
      entityId: user.id,
      metadata: { email, role: input.organizationRole },
    });

    const created = await this.orgUsers.listOrgUsers(input.organizationId);
    const dto = created.find((row) => row.userId === user!.id);
    if (!dto) throw new Error("USER_NOT_FOUND");
    return toOrgUserDto(dto);
  }

  async updateOrgUser(input: UpdateOrgUserInput): Promise<OrgUserDto> {
    if (!this.orgUsers.isAssignableRole(input.organizationRole)) {
      throw new Error("INVALID_ORG_ROLE");
    }

    const membership = await this.orgUsers.findMembership(input.organizationId, input.userId);
    if (!membership || membership.user.deleted) {
      throw new Error("USER_NOT_FOUND");
    }

    if (input.userId === input.actorUserId && membership.role === OrganizationRole.ORG_ADMIN) {
      if (input.organizationRole !== OrganizationRole.ORG_ADMIN) {
        const orgAdmins = await this.orgUsers.listOrgUsers(input.organizationId);
        const adminCount = orgAdmins.filter((u) => u.organizationRole === OrganizationRole.ORG_ADMIN).length;
        if (adminCount <= 1) {
          throw new Error("LAST_ORG_ADMIN");
        }
      }
    }

    const name = input.name.trim();
    if (!name) throw new Error("INVALID_INPUT");

    if (!isOrgWideRole(input.organizationRole) && input.propertyIds.length === 0) {
      throw new Error("PROPERTY_SCOPE_REQUIRED");
    }

    if (input.password?.trim()) {
      if (input.password.trim().length < 8) throw new Error("PASSWORD_TOO_SHORT");
      await this.orgUsers.updateUserPassword(
        input.userId,
        await bcrypt.hash(input.password.trim(), 12),
      );
    }

    if (membership.role === OrganizationRole.ORG_ADMIN && input.organizationRole !== OrganizationRole.ORG_ADMIN) {
      const orgAdmins = await this.orgUsers.listOrgUsers(input.organizationId);
      const adminCount = orgAdmins.filter((u) => u.organizationRole === OrganizationRole.ORG_ADMIN).length;
      if (adminCount <= 1) {
        throw new Error("LAST_ORG_ADMIN");
      }
    }

    await this.orgUsers.updateUserName(input.userId, name);
    await this.orgUsers.upsertMembership(input.userId, input.organizationId, input.organizationRole);

    if (isOrgWideRole(input.organizationRole)) {
      await this.orgUsers.clearPropertyAccess(input.organizationId, input.userId, input.actorUserId);
    } else {
      await this.propertyRbac.replacePropertyAccessSet({
        userId: input.userId,
        organizationId: input.organizationId,
        propertyIds: input.propertyIds,
        role: this.orgUsers.propertyRoleForOrganizationRole(input.organizationRole),
        actorUserId: input.actorUserId,
      });
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "rbac.orgUser.update",
      entityType: "UserOrganization",
      entityId: input.userId,
      metadata: { role: input.organizationRole, propertyCount: input.propertyIds.length },
    });

    const rows = await this.orgUsers.listOrgUsers(input.organizationId);
    const dto = rows.find((row) => row.userId === input.userId);
    if (!dto) throw new Error("USER_NOT_FOUND");
    return toOrgUserDto(dto);
  }

  async removeOrgUser(input: RemoveOrgUserInput): Promise<void> {
    if (input.userId === input.actorUserId) {
      throw new Error("CANNOT_REMOVE_SELF");
    }

    const membership = await this.orgUsers.findMembership(input.organizationId, input.userId);
    if (!membership || membership.user.deleted) {
      throw new Error("USER_NOT_FOUND");
    }

    if (membership.role === OrganizationRole.ORG_ADMIN) {
      const orgAdmins = await this.orgUsers.listOrgUsers(input.organizationId);
      const adminCount = orgAdmins.filter((u) => u.organizationRole === OrganizationRole.ORG_ADMIN).length;
      if (adminCount <= 1) {
        throw new Error("LAST_ORG_ADMIN");
      }
    }

    await this.orgUsers.clearPropertyAccess(input.organizationId, input.userId, input.actorUserId);
    const removed = await this.orgUsers.removeMembership(input.organizationId, input.userId);
    if (!removed) throw new Error("USER_NOT_FOUND");

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "rbac.orgUser.remove",
      entityType: "UserOrganization",
      entityId: input.userId,
    });
  }
}

export function createOrgUsersService(): OrgUsersService {
  return new OrgUsersService();
}
