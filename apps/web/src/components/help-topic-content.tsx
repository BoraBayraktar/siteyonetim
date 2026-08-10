import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import type { HelpNamedItem, HelpTopicContent as HelpTopicContentType } from "@/lib/help";

type Sections = {
  howTo: string;
  fields: string;
  fieldsEmpty: string;
  buttons: string;
  buttonsEmpty: string;
  tips: string;
};

type Props = {
  content: HelpTopicContentType;
  sections: Sections;
};

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>;
}

function NamedItemList({ items, emptyLabel }: { items: HelpNamedItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name} className="rounded-md border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
        </li>
      ))}
    </ul>
  );
}

export function HelpTopicContent({ content, sections }: Props) {
  return (
    <div className="space-y-6">
      {content.howTo.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading>{sections.howTo}</SectionHeading>
          <ol className="space-y-3">
            {content.howTo.map((step, index) => (
              <li key={`step-${index}`} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <Separator />

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-3">
          <SectionHeading>{sections.fields}</SectionHeading>
          <NamedItemList items={content.fields} emptyLabel={sections.fieldsEmpty} />
        </section>
        <section className="space-y-3">
          <SectionHeading>{sections.buttons}</SectionHeading>
          <NamedItemList items={content.buttons} emptyLabel={sections.buttonsEmpty} />
        </section>
      </div>

      {content.tips.length > 0 ? (
        <>
          <Separator />
          <section className="space-y-3">
            <SectionHeading>{sections.tips}</SectionHeading>
            <ul className="list-disc space-y-2 pl-5">
              {content.tips.map((tip, index) => (
                <li key={`tip-${index}`} className="text-sm text-muted-foreground">
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
