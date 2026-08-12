const LOCALE_SEPARATORS: Record<string, { thousand: string; decimal: string }> = {
  tr: { thousand: ".", decimal: "," },
  en: { thousand: ",", decimal: "." },
};

function separatorsFor(locale: string) {
  return LOCALE_SEPARATORS[locale] ?? LOCALE_SEPARATORS.en;
}

function escapeRegExp(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function groupThousands(digits: string, separator: string): string {
  if (!digits) return digits;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Ham "1234.5" (nokta ondalık, Prisma.Decimal uyumlu) değeri, locale'e uygun grup/ondalık ayracıyla ekrana yazılacak metne çevirir. */
export function formatAmountDisplay(raw: string, locale: string): string {
  if (!raw) return "";
  const { thousand, decimal } = separatorsFor(locale);
  const [intPartRaw, decPartRaw] = raw.split(".");
  const intPart = groupThousands(intPartRaw, thousand);
  return decPartRaw === undefined ? intPart : `${intPart}${decimal}${decPartRaw}`;
}

/**
 * Kullanıcının tutar alanına o an yazdığı ham metni (grup ayraçlarını da içerebilir) hem
 * Prisma.Decimal uyumlu ham değere ("1234.5") hem de locale'e uygun ekran gösterimine çevirir.
 */
export function maskAmountInput(typed: string, locale: string): { raw: string; display: string } {
  const { thousand, decimal } = separatorsFor(locale);
  const altDecimal = decimal === "," ? "." : ",";

  let cleaned = typed.split(thousand).join("");
  if (altDecimal !== thousand) {
    cleaned = cleaned.split(altDecimal).join(decimal);
  }
  cleaned = cleaned.replace(new RegExp(`[^0-9${escapeRegExp(decimal)}]`, "g"), "");

  const decimalIndex = cleaned.indexOf(decimal);
  let intPart = decimalIndex === -1 ? cleaned : cleaned.slice(0, decimalIndex);
  intPart = intPart.replace(/^0+(?=\d)/, "");

  if (decimalIndex === -1) {
    return { raw: intPart, display: groupThousands(intPart, thousand) };
  }

  const decPart = cleaned
    .slice(decimalIndex + 1)
    .replace(new RegExp(escapeRegExp(decimal), "g"), "")
    .slice(0, 2);
  return {
    raw: `${intPart || "0"}.${decPart}`,
    display: `${groupThousands(intPart, thousand)}${decimal}${decPart}`,
  };
}
