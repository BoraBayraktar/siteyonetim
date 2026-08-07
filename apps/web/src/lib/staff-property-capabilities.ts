import type { Session } from "next-auth";

import { DEFAULT_STAFF_OPS_PROFILE } from "@siteyonetim/property-settings";

import {
  canMutateAdminData,
  isAdminSession,
  isStaffRole,
  isSuperAdminSession,
} from "@/lib/auth-context";
import { getPropertySettingsService } from "@/lib/services";

export type StaffPropertyCapabilities = {
  canCreateAnnouncementDraft: boolean;
  canUploadDocuments: boolean;
  canManageIncidents: boolean;
  staffCanViewPartyPhone: boolean;
};

const DENIED: StaffPropertyCapabilities = {
  canCreateAnnouncementDraft: false,
  canUploadDocuments: false,
  canManageIncidents: false,
  staffCanViewPartyPhone: false,
};

export async function resolveStaffPropertyCapabilities(
  session: Session | null | undefined,
  organizationId: string,
  propertyId: string,
): Promise<StaffPropertyCapabilities> {
  if (!isAdminSession(session)) {
    return DENIED;
  }

  if (isSuperAdminSession(session) || canMutateAdminData(session)) {
    return {
      canCreateAnnouncementDraft: true,
      canUploadDocuments: true,
      canManageIncidents: true,
      staffCanViewPartyPhone: true,
    };
  }

  if (!isStaffRole(session.user.role)) {
    return DENIED;
  }

  const profile = await getPropertySettingsService().getStaffOpsProfile(organizationId, propertyId);

  return {
    canCreateAnnouncementDraft: profile.allowAnnouncementDraft ?? DEFAULT_STAFF_OPS_PROFILE.allowAnnouncementDraft,
    canUploadDocuments: profile.allowDocumentUpload ?? DEFAULT_STAFF_OPS_PROFILE.allowDocumentUpload,
    canManageIncidents: profile.allowIncidents ?? DEFAULT_STAFF_OPS_PROFILE.allowIncidents,
    staffCanViewPartyPhone: profile.staffCanViewPartyPhone ?? DEFAULT_STAFF_OPS_PROFILE.staffCanViewPartyPhone,
  };
}
