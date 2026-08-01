/** Daire no sayısal ise 0,1,2… sıralar; değilse localeCompare numeric. */
export function compareUnitCodes(a: string, b: string): number {
  const ta = a.trim();
  const tb = b.trim();
  const na = Number(ta);
  const nb = Number(tb);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && ta === String(na) && tb === String(nb)) {
    return na - nb;
  }
  return ta.localeCompare(tb, undefined, { numeric: true, sensitivity: "base" });
}

export function sortByUnitCode<T extends { unitCode: string }>(rows: T[]): T[] {
  return [...rows].sort((x, y) => compareUnitCodes(x.unitCode, y.unitCode));
}
