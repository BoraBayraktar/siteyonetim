import type { BlockDto } from "@siteyonetim/property-core";
import type { UnitOccupancyBoardRowDto } from "@siteyonetim/property-occupancy";
import type { PartyDto } from "@siteyonetim/property-parties";
import type { PropertyUtilityProfileDto } from "@siteyonetim/property-settings";

import {
  resolvePropertyStructureTab,
  resolveStructureSection,
  type PropertyStructureTab,
  type StructureSection,
} from "@/lib/property-structure-tab";
import {
  getBlockService,
  getOccupancyService,
  getPartyService,
  getPropertySettingsService,
} from "@/lib/services";

const LIST_SIZE = 500;

type PropertyContext = {
  organizationId: string;
  propertyId: string;
};

export type PropertyStructurePageData = {
  blocks: BlockDto[];
  unitBoard: UnitOccupancyBoardRowDto[];
  propertyParties: PartyDto[];
  orgParties: PartyDto[];
  utilityProfile: PropertyUtilityProfileDto | null;
};

function emptyStructureData(): PropertyStructurePageData {
  return {
    blocks: [],
    unitBoard: [],
    propertyParties: [],
    orgParties: [],
    utilityProfile: null,
  };
}

function needsBlocks(outerTab: PropertyStructureTab, section: StructureSection) {
  return outerTab === "structure" && (section === "blocks" || section === "units");
}

function needsUnitBoard(outerTab: PropertyStructureTab, section: StructureSection) {
  return outerTab === "structure" && section === "units";
}

function needsParties(outerTab: PropertyStructureTab, section: StructureSection) {
  return outerTab === "structure" && section === "parties";
}

function needsUtilityProfile(outerTab: PropertyStructureTab) {
  return outerTab === "utility";
}

export async function loadPropertyStructurePageData(
  ctx: PropertyContext,
  tab?: string | null,
): Promise<PropertyStructurePageData> {
  const outerTab = resolvePropertyStructureTab(tab);
  const section = resolveStructureSection(tab);

  if (outerTab === "structure" && !needsBlocks(outerTab, section) && !needsUnitBoard(outerTab, section) && !needsParties(outerTab, section)) {
    return emptyStructureData();
  }

  const [blocksPage, unitBoardPage, propertyPartiesPage, orgPartiesPage, utilityProfile] = await Promise.all([
    needsBlocks(outerTab, section)
      ? getBlockService().list({ ...ctx, page: 1, pageSize: LIST_SIZE })
      : Promise.resolve(null),
    needsUnitBoard(outerTab, section)
      ? getOccupancyService().listUnitBoard({ ...ctx, page: 1, pageSize: LIST_SIZE })
      : Promise.resolve(null),
    needsParties(outerTab, section)
      ? getPartyService().list({ ...ctx, page: 1, pageSize: LIST_SIZE })
      : Promise.resolve(null),
    needsParties(outerTab, section)
      ? getPartyService().list({ organizationId: ctx.organizationId, propertyId: null, page: 1, pageSize: LIST_SIZE })
      : Promise.resolve(null),
    needsUtilityProfile(outerTab)
      ? getPropertySettingsService().getUtilityProfile(ctx.organizationId, ctx.propertyId)
      : Promise.resolve(null),
  ]);

  return {
    blocks: blocksPage?.items ?? [],
    unitBoard: unitBoardPage?.items ?? [],
    propertyParties: propertyPartiesPage?.items ?? [],
    orgParties: orgPartiesPage?.items ?? [],
    utilityProfile,
  };
}
