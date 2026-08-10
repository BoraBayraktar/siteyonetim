"use client";

import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { HelpButton } from "@/components/help-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HelpTopicKey } from "@/lib/help";

type FormDrawerProps = {
  mode?: "insert" | "edit";
  triggerLabel?: string;
  title: string;
  description?: string;
  helpTopicKey?: HelpTopicKey;
  success?: boolean;
  disabled?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  children: ReactNode;
};

export function FormDrawer({
  mode = "insert",
  triggerLabel,
  title,
  description,
  helpTopicKey,
  success,
  disabled,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
  children,
}: FormDrawerProps) {
  const t = useTranslations("common");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const label = triggerLabel ?? (mode === "edit" ? t("edit") : t("insert"));

  useEffect(() => {
    if (success) {
      setOpen(false);
    }
  }, [success, setOpen]);

  return (
    <>
      {hideTrigger ? null : (
        <Button
          type="button"
          variant={mode === "edit" ? "outline" : "default"}
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          {mode === "edit" ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          {label}
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b px-4 py-4 pr-20 text-left">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>{title}</SheetTitle>
              {helpTopicKey ? <HelpButton topicKey={helpTopicKey} className="size-8 shrink-0" /> : null}
            </div>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="pb-8">{children}</div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
