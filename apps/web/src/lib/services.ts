import { createBlockService, createPropertyService, createUnitService } from "@siteyonetim/property-core";
import { createOccupancyService } from "@siteyonetim/property-occupancy";
import { createPartyService } from "@siteyonetim/property-parties";
import { createDuesService } from "@siteyonetim/finance-dues";
import { createFinanceService } from "@siteyonetim/finance-core";
import { createAuthService } from "@siteyonetim/platform-auth";

export function getAuthService() {
  return createAuthService();
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

export function getOccupancyService() {
  return createOccupancyService();
}

export function getFinanceService() {
  return createFinanceService();
}

export function getDuesService() {
  return createDuesService();
}
