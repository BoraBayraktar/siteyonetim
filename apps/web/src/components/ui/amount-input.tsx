"use client";

import * as React from "react";
import { useLocale } from "next-intl";

import { Input } from "@/components/ui/input";
import { formatAmountDisplay, maskAmountInput } from "@/lib/currency";

type AmountInputProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Para tutarı girişleri için shadcn Input'u saran bileşen: ekranda locale'e uygun
 * biçimlendirilmiş metni (örn. "25.000,00") gösterir, ancak name verildiğinde
 * form gönderiminde ("FormData") Prisma.Decimal ile uyumlu ham değeri ("25000.00")
 * ayrı bir hidden input üzerinden taşır — görünen alan asla name taşımaz.
 */
export function AmountInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  required,
  disabled,
  className,
  ...rest
}: AmountInputProps) {
  const locale = useLocale();
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(() => {
    const raw = defaultValue ?? "";
    return { raw, display: formatAmountDisplay(raw, locale) };
  });

  const rawValue = isControlled ? value ?? "" : uncontrolled.raw;
  const display = isControlled ? formatAmountDisplay(value ?? "", locale) : uncontrolled.display;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskAmountInput(event.target.value, locale);
    if (!isControlled) setUncontrolled(masked);
    onChange?.(masked.raw);
  }

  return (
    <>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={className}
        value={display}
        onChange={handleChange}
        {...rest}
      />
      {name ? <input type="hidden" name={name} disabled={disabled} value={rawValue} /> : null}
    </>
  );
}
