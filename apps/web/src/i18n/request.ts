import { getRequestConfig } from "next-intl/server";

import enMessages from "../messages/en.json";
import trMessages from "../messages/tr.json";
import { routing } from "./routing";

const allMessages = {
  tr: trMessages,
  en: enMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "tr" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: allMessages[locale as keyof typeof allMessages],
  };
});
