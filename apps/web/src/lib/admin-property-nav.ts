export type AdminPropertyNavItem = {
  id: string;
  name: string;
};

export function isPilotSinglePropertyMode(propertiesNav: AdminPropertyNavItem[]): boolean {
  return propertiesNav.length === 1;
}
