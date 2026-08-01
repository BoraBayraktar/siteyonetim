export type AnnouncementPublishStatus = "scheduled" | "active" | "expired";

export function parsePublishStartDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return new Date(`${trimmed}T00:00:00.000Z`);
}

export function parsePublishEndDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return new Date(`${trimmed}T23:59:59.999Z`);
}

export function resolvePublishWindow(startRaw: string, endRaw: string): {
  publishStartAt: Date;
  publishEndAt: Date;
} {
  const publishStartAt = parsePublishStartDate(startRaw);
  const publishEndAt = parsePublishEndDate(endRaw);
  if (!publishStartAt || !publishEndAt) {
    throw new Error("ANNOUNCEMENT_PUBLISH_DATES_REQUIRED");
  }
  if (publishEndAt < publishStartAt) {
    throw new Error("ANNOUNCEMENT_PUBLISH_END_BEFORE_START");
  }
  return { publishStartAt, publishEndAt };
}

export function getAnnouncementPublishStatus(
  publishStartAt: Date,
  publishEndAt: Date,
  now: Date = new Date(),
): AnnouncementPublishStatus {
  if (now < publishStartAt) {
    return "scheduled";
  }
  if (now > publishEndAt) {
    return "expired";
  }
  return "active";
}

export function formatDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function defaultPublishEndDate(start: Date, days = 30): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);
  return end;
}

export function portalVisibilityFilter(now: Date = new Date()) {
  return {
    publishStartAt: { lte: now },
    publishEndAt: { gte: now },
  };
}
