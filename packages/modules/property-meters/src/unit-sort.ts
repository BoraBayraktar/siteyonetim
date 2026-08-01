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

export function sortMetersByUnitCode<T extends { unitCode: string; kind: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const byCode = compareUnitCodes(left.unitCode, right.unitCode);
    if (byCode !== 0) {
      return byCode;
    }
    return left.kind.localeCompare(right.kind);
  });
}
