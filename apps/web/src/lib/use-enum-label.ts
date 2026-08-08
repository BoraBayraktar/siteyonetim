"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { enumLabel, type EnumLabelFn } from "@/lib/enum-labels";

/** Client hook returning `(enumName, value) => localized label`. */
export function useEnumLabel(): EnumLabelFn {
  const t = useTranslations("enums");
  return useCallback((enumName: string, value: string | null | undefined) => enumLabel(t, enumName, value), [t]);
}
