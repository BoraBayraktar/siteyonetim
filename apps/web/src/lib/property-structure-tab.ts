export type PropertyStructureTab = "structure" | "utility";

export type StructureSection = "blocks" | "units" | "parties" | "occupancy";

const STRUCTURE_SECTIONS = new Set<string>(["blocks", "units", "parties", "occupancy"]);

export function resolvePropertyStructureTab(tab?: string | null): PropertyStructureTab {
  if (tab === "utility") {
    return "utility";
  }
  return "structure";
}

export function resolveStructureSection(tab?: string | null): StructureSection {
  if (tab === "occupancy") {
    return "units";
  }
  if (tab && STRUCTURE_SECTIONS.has(tab)) {
    return tab as StructureSection;
  }
  return "units";
}

/** `nav` namespace keys for sidebar / page area title */
export function propertyStructureNavKey(tab: PropertyStructureTab): string {
  if (tab === "utility") {
    return "tabUtility";
  }
  return "menuStructure";
}

export function structureSectionNavKey(section: StructureSection): string {
  switch (section) {
    case "units":
      return "tabUnits";
    case "parties":
      return "tabParties";
    case "occupancy":
      return "tabOccupancy";
    default:
      return "tabBlocks";
  }
}
