const ACCRUAL_SKIP_ERRORS = new Set([
  "ACCRUAL_ALREADY_POSTED",
  "TOTAL_BILL_REQUIRED",
  "NO_ACCRUAL_LINES",
  "NO_METER_CONSUMPTION",
  "INCOMPLETE_METER_READINGS",
]);

export function isSkippableAccrualJobError(message: string): boolean {
  return ACCRUAL_SKIP_ERRORS.has(message);
}
