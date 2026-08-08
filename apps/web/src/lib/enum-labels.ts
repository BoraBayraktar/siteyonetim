export type EnumTranslator = (key: string, values?: { defaultMessage?: string }) => string;

/** Resolve a Prisma enum value to a localized label via `enums.{EnumName}.{VALUE}`. */
export function enumLabel(
  t: EnumTranslator,
  enumName: string,
  value: string | null | undefined,
): string {
  if (value == null || value === "") {
    return "—";
  }
  return t(`${enumName}.${value}`, { defaultMessage: value });
}

export type EnumLabelFn = (enumName: string, value: string | null | undefined) => string;
