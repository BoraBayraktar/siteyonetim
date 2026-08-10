export const HELP_TOPIC_KEYS = [
  "gettingStarted",
  "dashboard",
  "setup",
  "units",
  "dues",
  "cashbox",
  "accrual",
  "draftAccrual",
  "postAccrual",
  "register",
  "collection",
  "account",
  "expenses",
  "lateFee",
  "reports",
  "simpleMode",
  "staffResidents",
  "createProperty",
  "orgUserInvite",
] as const;

export type HelpTopicKey = (typeof HELP_TOPIC_KEYS)[number];

export type HelpNamedItem = {
  name: string;
  desc: string;
};

export type HelpTopicContent = {
  title: string;
  summary: string;
  where: string;
  screen: string;
  howTo: string[];
  fields: HelpNamedItem[];
  buttons: HelpNamedItem[];
  tips: string[];
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNamedItems(value: unknown): HelpNamedItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.name !== "string" || typeof record.desc !== "string") return [];
    return [{ name: record.name, desc: record.desc }];
  });
}

export function readHelpTopic(raw: unknown): HelpTopicContent | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.summary !== "string") return null;
  return {
    title: record.title,
    summary: record.summary,
    where: typeof record.where === "string" ? record.where : "",
    screen: typeof record.screen === "string" ? record.screen : "",
    howTo: asStringArray(record.howTo),
    fields: asNamedItems(record.fields),
    buttons: asNamedItems(record.buttons),
    tips: asStringArray(record.tips),
  };
}
