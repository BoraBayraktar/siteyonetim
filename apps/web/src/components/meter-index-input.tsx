"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Sayaç endeksi: yalnızca rakam ve tek ondalık ayırıcı (virgül veya nokta). */
export function sanitizeMeterIndexInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) {
    return "";
  }

  const normalized = cleaned.replace(/,/g, ".");
  const [whole, ...fractionParts] = normalized.split(".");
  if (fractionParts.length === 0) {
    return whole ?? "";
  }

  return `${whole}.${fractionParts.join("")}`;
}

type MeterIndexInputProps = Omit<ComponentProps<typeof Input>, "type" | "inputMode">;

export function MeterIndexInput({ className, onChange, onInput, ...props }: MeterIndexInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      className={cn("tabular-nums", className)}
      onInput={(event) => {
        const input = event.currentTarget;
        const sanitized = sanitizeMeterIndexInput(input.value);
        if (input.value !== sanitized) {
          input.value = sanitized;
        }
        onInput?.(event);
      }}
      onChange={(event) => {
        const sanitized = sanitizeMeterIndexInput(event.currentTarget.value);
        if (event.currentTarget.value !== sanitized) {
          event.currentTarget.value = sanitized;
        }
        onChange?.(event);
      }}
    />
  );
}
