"use client";

import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { HelpTopicContent } from "@/components/help-topic-content";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { readHelpTopic, type HelpTopicKey } from "@/lib/help";

type Props = {
  topicKey: HelpTopicKey;
  className?: string;
};

export function HelpButton({ topicKey, className }: Props) {
  const t = useTranslations("help");
  const [open, setOpen] = useState(false);
  const content = readHelpTopic(t.raw(`topics.${topicKey}`));

  if (!content) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        aria-label={t("trigger")}
        title={t("trigger")}
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="size-5" aria-hidden />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-4 py-4 pr-20 text-left">
            <SheetTitle>{content.title}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="pb-8">
              <HelpTopicContent
                content={content}
                sections={{
                  howTo: t("sections.howTo"),
                  fields: t("sections.fields"),
                  fieldsEmpty: t("sections.fieldsEmpty"),
                  buttons: t("sections.buttons"),
                  buttonsEmpty: t("sections.buttonsEmpty"),
                  tips: t("sections.tips"),
                }}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
