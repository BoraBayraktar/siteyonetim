/** Runtime-safe status values (avoid module-load dependency on generated Prisma enums). */
export const INCIDENT_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  CLOSED: "CLOSED",
} as const;

export type IncidentStatusValue = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

const STAFF_TRANSITIONS: Record<IncidentStatusValue, IncidentStatusValue[]> = {
  OPEN: [INCIDENT_STATUS.IN_PROGRESS],
  IN_PROGRESS: [INCIDENT_STATUS.CLOSED],
  CLOSED: [],
};

export function isStaffIncidentTransitionAllowed(from: IncidentStatusValue, to: IncidentStatusValue): boolean {
  return (STAFF_TRANSITIONS[from] ?? []).includes(to);
}
