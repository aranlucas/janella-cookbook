"use client";

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { jsonValueSchema } from "@/lib/json";
import { ChevronDownIcon, WrenchIcon } from "lucide-react";
import { isValidElement } from "react";
import { z } from "zod";

import { CodeBlock } from "./code-block";
import { ToolStatusBadge } from "./tool-status-badge";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn("group mbe-4 w-full rounded-md border", className)} {...props} />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  readonly title?: string;
  readonly className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: Readonly<ToolHeaderProps>) => {
  const derivedName = type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn("flex w-full items-center justify-between gap-4 p-3", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title ?? derivedName}</span>
        <ToolStatusBadge status={state} />
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "flex flex-col gap-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  readonly input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("flex flex-col gap-2 overflow-hidden", className)} {...props}>
    <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  readonly output: ToolPart["output"];
  readonly errorText: ToolPart["errorText"];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  const textOutput = z.string().safeParse(output);
  const jsonOutput = jsonValueSchema.safeParse(output);
  let outputContent: ReactNode;

  if (textOutput.success) {
    outputContent = <CodeBlock code={textOutput.data} language="json" />;
  } else if (isValidElement(output)) {
    outputContent = output;
  } else if (jsonOutput.success) {
    outputContent = <CodeBlock code={JSON.stringify(jsonOutput.data, null, 2)} language="json" />;
  } else {
    outputContent = <div>Result could not be displayed.</div>;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-foreground",
        )}
      >
        {errorText && <div>{errorText}</div>}
        {outputContent}
      </div>
    </div>
  );
};
