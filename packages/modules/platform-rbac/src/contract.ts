import { OrganizationRole, type PropertyAccessRole } from "@siteyonetim/db";

export type PropertyAccessEntryDto = {
  propertyId: string;
  propertyName: string;
  role: PropertyAccessRole;
};

export type AdminPortalKind = "ADMIN" | "AUDITOR" | "STAFF";

export type OrgUserDto = {
  userId: string;
  email: string;
  name: string;
  organizationRole: OrganizationRole;
  portalKind: AdminPortalKind;
  propertyAccess: PropertyAccessEntryDto[];
};

export type OrgPropertyOptionDto = {
  id: string;
  name: string;
};

export type ListOrgUsersInput = {
  organizationId: string;
};

export type CreateOrgUserInput = {
  organizationId: string;
  email: string;
  name: string;
  password: string;
  organizationRole: OrganizationRole;
  propertyIds: string[];
  actorUserId: string;
};

export type UpdateOrgUserInput = {
  organizationId: string;
  userId: string;
  name: string;
  organizationRole: OrganizationRole;
  propertyIds: string[];
  password?: string | null;
  actorUserId: string;
};

export type RemoveOrgUserInput = {
  organizationId: string;
  userId: string;
  actorUserId: string;
};

export type ResolvePropertyAccessInput = {
  userId: string;
  organizationId: string;
  organizationRole: OrganizationRole | null;
};

export type GrantPropertyAccessInput = {
  userId: string;
  organizationId: string;
  propertyId: string;
  role: PropertyAccessRole;
  actorUserId: string;
};

export type RevokePropertyAccessInput = {
  userId: string;
  organizationId: string;
  propertyId: string;
  actorUserId: string;
};

export type AssertPropertyAccessInput = {
  userId: string;
  organizationId: string;
  organizationRole: OrganizationRole | null;
  propertyId: string;
  allowedRoles?: PropertyAccessRole[];
};

export interface PropertyRbacServiceContract {
  resolveAccessiblePropertyIds(input: ResolvePropertyAccessInput): Promise<string[] | "ALL">;
  listPropertyAccess(input: ResolvePropertyAccessInput): Promise<PropertyAccessEntryDto[]>;
  hasPropertyAccess(input: AssertPropertyAccessInput): Promise<boolean>;
  assertPropertyAccess(input: AssertPropertyAccessInput): Promise<void>;
  grantPropertyAccess(input: GrantPropertyAccessInput): Promise<void>;
  revokePropertyAccess(input: RevokePropertyAccessInput): Promise<void>;
  syncAuditorPropertyAccess(input: {
    userId: string;
    organizationId: string;
    propertyIds: string[];
    actorUserId: string;
  }): Promise<void>;
  listOrgUsers(input: ListOrgUsersInput): Promise<OrgUserDto[]>;
  listOrgPropertyOptions(organizationId: string): Promise<OrgPropertyOptionDto[]>;
  createOrgUser(input: CreateOrgUserInput): Promise<OrgUserDto>;
  updateOrgUser(input: UpdateOrgUserInput): Promise<OrgUserDto>;
  removeOrgUser(input: RemoveOrgUserInput): Promise<void>;
}

export function portalKindForOrganizationRole(role: OrganizationRole): AdminPortalKind {
  if (role === OrganizationRole.AUDITOR) {
    return "AUDITOR";
  }
  if (role === OrganizationRole.STAFF) {
    return "STAFF";
  }
  return "ADMIN";
}

export function organizationRoleToPropertyAccessRole(role: OrganizationRole): PropertyAccessRole {
  switch (role) {
    case "ORG_ADMIN":
      return "PROPERTY_ADMIN";
    case "PROPERTY_MANAGER":
      return "PROPERTY_MANAGER";
    case "ACCOUNTANT":
      return "PROPERTY_ACCOUNTANT";
    case "AUDITOR":
      return "PROPERTY_AUDITOR";
    case "BOARD_MEMBER":
      return "PROPERTY_BOARD_MEMBER";
    case "STAFF":
      return "PROPERTY_STAFF";
    default:
      return "PROPERTY_STAFF";
  }
}
