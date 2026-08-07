import { OrganizationRole } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  AssertPropertyAccessInput,
  CreateOrgUserInput,
  GrantPropertyAccessInput,
  ListOrgUsersInput,
  OrgPropertyOptionDto,
  OrgUserDto,
  PropertyRbacServiceContract,
  RemoveOrgUserInput,
  ResolvePropertyAccessInput,
  RevokePropertyAccessInput,
  UpdateOrgUserInput,
} from "./contract";
import { organizationRoleToPropertyAccessRole } from "./contract";
import { createOrgUsersService, OrgUsersService } from "./org-users.service";
import { PropertyRbacRepository } from "./repository";

function isOrgWideRole(role: OrganizationRole | null | undefined): boolean {
  return role === OrganizationRole.ORG_ADMIN;
}

export class PropertyRbacService implements PropertyRbacServiceContract {
  constructor(
    private readonly repository = new PropertyRbacRepository(),
    private readonly orgUsers = createOrgUsersService(),
    private readonly audit = createAuditService(),
  ) {}

  async resolveAccessiblePropertyIds(input: ResolvePropertyAccessInput): Promise<string[] | "ALL"> {
    if (await this.repository.isSuperAdminUser(input.userId)) {
      return "ALL";
    }

    if (isOrgWideRole(input.organizationRole)) {
      return "ALL";
    }

    const entries = await this.repository.listPropertyAccessForUser(input);
    return entries.map((e) => e.propertyId);
  }

  async listPropertyAccess(input: ResolvePropertyAccessInput) {
    if (isOrgWideRole(input.organizationRole)) {
      const ids = await this.repository.listAllPropertyIds(input.organizationId);
      const properties = await Promise.all(
        ids.map(async (propertyId) => {
          const name = await this.repository.findPropertyName(input.organizationId, propertyId);
          return {
            propertyId,
            propertyName: name ?? propertyId,
            role: organizationRoleToPropertyAccessRole(input.organizationRole!),
          };
        }),
      );
      return properties;
    }

    return this.repository.listPropertyAccessForUser(input);
  }

  async hasPropertyAccess(input: AssertPropertyAccessInput): Promise<boolean> {
    if (isOrgWideRole(input.organizationRole)) {
      return this.repository.propertyBelongsToOrg(input.organizationId, input.propertyId);
    }

    if (await this.repository.isSuperAdminUser(input.userId)) {
      return this.repository.propertyExists(input.propertyId);
    }

    const role = await this.repository.findPropertyAccess(
      input.userId,
      input.organizationId,
      input.propertyId,
    );
    if (!role) return false;
    if (!input.allowedRoles?.length) return true;
    return input.allowedRoles.includes(role);
  }

  async assertPropertyAccess(input: AssertPropertyAccessInput): Promise<void> {
    const ok = await this.hasPropertyAccess(input);
    if (!ok) {
      throw new Error("PROPERTY_ACCESS_DENIED");
    }
  }

  async grantPropertyAccess(input: GrantPropertyAccessInput) {
    const ok = await this.repository.propertyBelongsToOrg(input.organizationId, input.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");

    await this.repository.upsertPropertyAccess({
      userId: input.userId,
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      role: input.role,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "rbac.propertyAccess.grant",
      entityType: "UserPropertyAccess",
      entityId: `${input.userId}:${input.propertyId}`,
      metadata: { targetUserId: input.userId, role: input.role },
    });
  }

  async revokePropertyAccess(input: RevokePropertyAccessInput) {
    await this.repository.softDeletePropertyAccess(
      input.userId,
      input.organizationId,
      input.propertyId,
      input.actorUserId,
    );

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "rbac.propertyAccess.revoke",
      entityType: "UserPropertyAccess",
      entityId: `${input.userId}:${input.propertyId}`,
      metadata: { targetUserId: input.userId },
    });
  }

  async syncAuditorPropertyAccess(input: {
    userId: string;
    organizationId: string;
    propertyIds: string[];
    actorUserId: string;
  }) {
    await this.repository.replacePropertyAccessSet({
      userId: input.userId,
      organizationId: input.organizationId,
      propertyIds: input.propertyIds,
      role: "PROPERTY_AUDITOR",
      actorUserId: input.actorUserId,
    });
  }

  listOrgUsers(input: ListOrgUsersInput): Promise<OrgUserDto[]> {
    return this.orgUsers.listOrgUsers(input);
  }

  listOrgPropertyOptions(organizationId: string): Promise<OrgPropertyOptionDto[]> {
    return this.orgUsers.listOrgPropertyOptions(organizationId);
  }

  createOrgUser(input: CreateOrgUserInput): Promise<OrgUserDto> {
    return this.orgUsers.createOrgUser(input);
  }

  updateOrgUser(input: UpdateOrgUserInput): Promise<OrgUserDto> {
    return this.orgUsers.updateOrgUser(input);
  }

  removeOrgUser(input: RemoveOrgUserInput): Promise<void> {
    return this.orgUsers.removeOrgUser(input);
  }
}

export function createPropertyRbacService(): PropertyRbacService {
  return new PropertyRbacService();
}
