import { Prisma, SupplierLateFeeAllocationMode } from "@siteyonetim/db";

export type SupplierLateFeeUnitRow = {
  id: string;
  areaM2: Prisma.Decimal | null;
  shareRatio: Prisma.Decimal | null;
};

export type DelinquentUnitDebt = {
  unitId: string;
  remaining: Prisma.Decimal;
};

function splitByShare(units: SupplierLateFeeUnitRow[], total: Prisma.Decimal) {
  const sumShare = units.reduce(
    (acc, unit) => acc.add(unit.shareRatio ?? new Prisma.Decimal(0)),
    new Prisma.Decimal(0),
  );
  if (sumShare.lte(0)) return new Map<string, Prisma.Decimal>();

  const map = new Map<string, Prisma.Decimal>();
  for (const unit of units) {
    const share = unit.shareRatio ?? new Prisma.Decimal(0);
    if (share.lte(0)) continue;
    map.set(unit.id, total.mul(share).div(sumShare).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
  }
  return map;
}

function splitByArea(units: SupplierLateFeeUnitRow[], total: Prisma.Decimal) {
  const sumArea = units.reduce(
    (acc, unit) => acc.add(unit.areaM2 ?? new Prisma.Decimal(0)),
    new Prisma.Decimal(0),
  );
  if (sumArea.lte(0)) return new Map<string, Prisma.Decimal>();

  const map = new Map<string, Prisma.Decimal>();
  for (const unit of units) {
    const area = unit.areaM2 ?? new Prisma.Decimal(0);
    if (area.lte(0)) continue;
    map.set(unit.id, total.mul(area).div(sumArea).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
  }
  return map;
}

function splitEqual(unitIds: string[], total: Prisma.Decimal) {
  const map = new Map<string, Prisma.Decimal>();
  if (unitIds.length === 0) return map;

  const perUnit = total.div(unitIds.length).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  let allocated = new Prisma.Decimal(0);
  const sorted = [...unitIds].sort((a, b) => a.localeCompare(b));

  for (let i = 0; i < sorted.length; i += 1) {
    const unitId = sorted[i]!;
    const isLast = i === sorted.length - 1;
    const amount = isLast ? total.sub(allocated) : perUnit;
    map.set(unitId, amount.lt(0) ? new Prisma.Decimal(0) : amount);
    allocated = allocated.add(map.get(unitId)!);
  }

  return map;
}

function splitByDebtRatio(delinquentDebts: DelinquentUnitDebt[], total: Prisma.Decimal) {
  const map = new Map<string, Prisma.Decimal>();
  const sum = delinquentDebts.reduce((acc, row) => acc.add(row.remaining), new Prisma.Decimal(0));
  if (sum.lte(0)) return map;

  const sorted = [...delinquentDebts].sort((a, b) => a.unitId.localeCompare(b.unitId));
  let allocated = new Prisma.Decimal(0);

  for (let i = 0; i < sorted.length; i += 1) {
    const row = sorted[i]!;
    const isLast = i === sorted.length - 1;
    const amount = isLast
      ? total.sub(allocated)
      : total.mul(row.remaining).div(sum).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    map.set(row.unitId, amount.lt(0) ? new Prisma.Decimal(0) : amount);
    allocated = allocated.add(map.get(row.unitId)!);
  }

  return map;
}

export function allocateSupplierLateFee(
  mode: SupplierLateFeeAllocationMode,
  total: Prisma.Decimal,
  units: SupplierLateFeeUnitRow[],
  delinquentDebts: DelinquentUnitDebt[],
): Map<string, Prisma.Decimal> {
  if (total.lte(0)) {
    throw new Error("AMOUNT_INVALID");
  }

  if (mode === SupplierLateFeeAllocationMode.ALL_UNITS_BY_SHARE) {
    const byShare = splitByShare(units, total);
    return byShare.size > 0 ? byShare : splitByArea(units, total);
  }

  if (mode === SupplierLateFeeAllocationMode.ALL_UNITS_EQUAL) {
    return splitEqual(
      units.map((unit) => unit.id),
      total,
    );
  }

  if (delinquentDebts.length === 0) {
    throw new Error("SUPPLIER_LATE_FEE_NO_DELINQUENT_UNITS");
  }

  if (mode === SupplierLateFeeAllocationMode.DELINQUENT_BY_DEBT_RATIO) {
    return splitByDebtRatio(delinquentDebts, total);
  }

  return splitEqual(
    delinquentDebts.map((row) => row.unitId),
    total,
  );
}

export function isSupplierLateFeeMode(mode: SupplierLateFeeAllocationMode): boolean {
  return (
    mode === SupplierLateFeeAllocationMode.DELINQUENT_BY_DEBT_RATIO ||
    mode === SupplierLateFeeAllocationMode.DELINQUENT_EQUAL
  );
}
