import { createBlockService, createPropertyService, createUnitService } from "@siteyonetim/property-core";
import { createOccupancyService } from "@siteyonetim/property-occupancy";
import { createPartyService } from "@siteyonetim/property-parties";
import { createStaffFinanceService } from "@siteyonetim/property-staff-finance";
import { createAnnouncementService, createAnnouncementImageService } from "@siteyonetim/comm-announcements";
import { createNotificationService } from "@siteyonetim/comm-notifications";
import { createIncidentService } from "@siteyonetim/itsm-incidents";
import { createDocumentService } from "@siteyonetim/document-management";
import { createPropertySettingsService } from "@siteyonetim/property-settings";
import { createGovernanceService } from "@siteyonetim/property-governance";
import { createMeterService } from "@siteyonetim/property-meters";
import { createAuditorReportService } from "@siteyonetim/reporting-auditor";
import { createBankingService } from "@siteyonetim/finance-banking";
import { createPaymentGatewayService } from "@siteyonetim/payments-gateway";
import { createStandardReportingService } from "@siteyonetim/reporting-standard";
import { createDuesService } from "@siteyonetim/finance-dues";
import { createFinanceService } from "@siteyonetim/finance-core";
import { createAuthService, createUserPreferenceService } from "@siteyonetim/platform-auth";
import { createPropertyRbacService } from "@siteyonetim/platform-rbac";
import { createPropertyTenantService } from "@siteyonetim/platform-tenant";

export function getAuthService() {
  return createAuthService();
}

export function getUserPreferenceService() {
  return createUserPreferenceService();
}

export function getPropertyTenantService() {
  return createPropertyTenantService();
}

export function getPropertyRbacService() {
  return createPropertyRbacService();
}

export function getPropertyService() {
  return createPropertyService();
}

export function getBlockService() {
  return createBlockService();
}

export function getUnitService() {
  return createUnitService();
}

export function getPartyService() {
  return createPartyService();
}

export function getStaffFinanceService() {
  return createStaffFinanceService();
}

export function getOccupancyService() {
  return createOccupancyService();
}

export function getFinanceService() {
  return createFinanceService();
}

export function getDuesService() {
  return createDuesService();
}

export function getAnnouncementService() {
  return createAnnouncementService();
}

export function getAnnouncementImageService() {
  return createAnnouncementImageService();
}

export function getNotificationService() {
  return createNotificationService();
}

export function getDocumentService() {
  return createDocumentService();
}

export function getPropertySettingsService() {
  return createPropertySettingsService();
}

export function getMeterService() {
  return createMeterService();
}

export function getReportingService() {
  return createStandardReportingService();
}

export function getAuditorReportService() {
  return createAuditorReportService();
}

export function getBankingService() {
  return createBankingService();
}

export function getPaymentGatewayService() {
  return createPaymentGatewayService();
}

export function getGovernanceService() {
  return createGovernanceService();
}

export function getIncidentService() {
  return createIncidentService();
}
