"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PartyComboboxOption = {
  id: string;
  displayName: string;
};

type Props = {
  parties: PartyComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  emptyValueLabel?: string;
};

export function PartyCombobox({
  parties,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  id,
  disabled = false,
  className,
  allowEmpty = false,
  emptyValueLabel,
}: Props) {
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parties.find((party) => party.id === value), [parties, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected?.displayName ?? placeholder ?? tCommon("selectParty")}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? tCommon("searchParty")} />
          <CommandList>
            <CommandEmpty>{emptyLabel ?? tCommon("noPartyResults")}</CommandEmpty>
            <CommandGroup>
              {allowEmpty ? (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value === "" ? "opacity-100" : "opacity-0")} />
                  <span>{emptyValueLabel ?? tCommon("none")}</span>
                </CommandItem>
              ) : null}
              {parties.map((party) => (
                <CommandItem
                  key={party.id}
                  value={`${party.displayName} ${party.id}`}
                  onSelect={() => {
                    onValueChange(party.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value === party.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{party.displayName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
