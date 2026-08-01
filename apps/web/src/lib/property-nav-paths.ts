export function isPropertyStructurePath(pathname: string, propertyId: string): boolean {
  const marker = `/admin/properties/${propertyId}`;
  const idx = pathname.indexOf(marker);
  if (idx === -1) {
    return false;
  }

  const rest = pathname.slice(idx + marker.length);
  if (rest === "" || rest === "/") {
    return true;
  }

  return rest.startsWith("?");
}
