"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type FieldHelpProps = {
  label: string;
  content: string;
  className?: string;
};

export function FieldHelp({ label, content, className }: FieldHelpProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-6 shrink-0 text-muted-foreground", className)}
            aria-label={label}
          >
            <CircleHelp className="size-3.5" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left font-normal leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type LabelWithHelpProps = {
  htmlFor?: string;
  label: string;
  help: string;
  className?: string;
};

export function LabelWithHelp({ htmlFor, label, help, className }: LabelWithHelpProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <FieldHelp label={label} content={help} />
    </div>
  );
}
