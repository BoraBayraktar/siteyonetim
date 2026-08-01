"use client";

import { isHtmlAnnouncementBody, type AnnouncementBodyFormatValue } from "@siteyonetim/comm-announcements/body-format";
import { cn } from "@/lib/utils";

type Props = {
  body: string;
  bodyFormat: AnnouncementBodyFormatValue;
  className?: string;
};

export function AnnouncementBodyContent({ body, bodyFormat, className }: Props) {
  if (isHtmlAnnouncementBody(bodyFormat)) {
    return (
      <div
        className={cn("announcement-body text-sm text-muted-foreground", className)}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  }

  return <p className={cn("whitespace-pre-wrap text-sm text-muted-foreground", className)}>{body}</p>;
}
