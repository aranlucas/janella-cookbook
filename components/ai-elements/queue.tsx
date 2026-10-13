"use client";

import type { ComponentProps } from "react";
import type { ImageProps } from "next/image";
import NextImage from "next/image";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, PaperclipIcon } from "lucide-react";

export interface QueueMessagePart {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
}

export interface QueueMessage {
  readonly id: string;
  readonly parts: readonly QueueMessagePart[];
}

export interface QueueTodo {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "completed";
}

export type QueueItemProps = ComponentProps<"li">;

export const QueueItem = ({ className, ...props }: QueueItemProps) => (
  <li
    className={cn(
      "group flex flex-col gap-1 rounded-md px-3 py-1 text-sm transition-colors hover:bg-muted",
      className,
    )}
    {...props}
  />
);

export type QueueItemIndicatorProps = ComponentProps<"span"> & {
  readonly completed?: boolean;
};

export const QueueItemIndicator = ({
  completed = false,
  className,
  ...props
}: QueueItemIndicatorProps) => (
  <span
    className={cn(
      "mbs-0.5 inline-block size-2.5 rounded-full border",
      completed
        ? "border-muted-foreground/20 bg-muted-foreground/10"
        : "border-muted-foreground/50",
      className,
    )}
    {...props}
  />
);

export type QueueItemContentProps = ComponentProps<"span"> & {
  readonly completed?: boolean;
};

export const QueueItemContent = ({
  completed = false,
  className,
  ...props
}: QueueItemContentProps) => (
  <span
    className={cn(
      "line-clamp-1 grow wrap-break-word",
      completed ? "text-muted-foreground/50 line-through" : "text-muted-foreground",
      className,
    )}
    {...props}
  />
);

export type QueueItemDescriptionProps = ComponentProps<"div"> & {
  readonly completed?: boolean;
};

export const QueueItemDescription = ({
  completed = false,
  className,
  ...props
}: QueueItemDescriptionProps) => (
  <div
    className={cn(
      "ms-6 text-xs",
      completed ? "text-muted-foreground/40 line-through" : "text-muted-foreground",
      className,
    )}
    {...props}
  />
);

export type QueueItemActionsProps = ComponentProps<"div">;

export const QueueItemActions = ({ className, ...props }: QueueItemActionsProps) => (
  <div className={cn("flex gap-1", className)} {...props} />
);

export type QueueItemActionProps = Omit<ComponentProps<typeof Button>, "variant" | "size">;

export const QueueItemAction = ({
  className,
  ...props
}: Readonly<Omit<ComponentProps<typeof Button>, "variant" | "size">>) => (
  <Button
    className={cn(
      "size-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted-foreground/10 hover:text-foreground",
      className,
    )}
    size="icon"
    type="button"
    variant="ghost"
    {...props}
  />
);

export type QueueItemAttachmentProps = ComponentProps<"div">;

export const QueueItemAttachment = ({ className, ...props }: QueueItemAttachmentProps) => (
  <div className={cn("mbs-1 flex flex-wrap gap-2", className)} {...props} />
);

export type QueueItemImageProps = Omit<ImageProps, "alt" | "height" | "width"> &
  Partial<Pick<ImageProps, "alt" | "height" | "width">>;

export const QueueItemImage = ({
  className,
  ...props
}: Readonly<
  Omit<ImageProps, "alt" | "height" | "width"> &
    Partial<Pick<ImageProps, "alt" | "height" | "width">>
>) => (
  <NextImage
    {...props}
    alt={props.alt ?? ""}
    className={cn("size-8 rounded border object-cover", className)}
    height={props.height ?? 32}
    unoptimized
    width={props.width ?? 32}
  />
);

export type QueueItemFileProps = ComponentProps<"span">;

export const QueueItemFile = ({ children, className, ...props }: QueueItemFileProps) => (
  <span
    className={cn("flex items-center gap-1 rounded border bg-muted px-2 py-1 text-xs", className)}
    {...props}
  >
    <PaperclipIcon size={12} />
    <span className="max-w-25 truncate">{children}</span>
  </span>
);

export type QueueListProps = ComponentProps<typeof ScrollArea>;

export const QueueList = ({ children, className, ...props }: QueueListProps) => (
  <ScrollArea className={cn("mbs-2 -mbe-1", className)} {...props}>
    <div className="max-h-40 pe-4">
      <ul>{children}</ul>
    </div>
  </ScrollArea>
);

// QueueSection - collapsible section container
export type QueueSectionProps = ComponentProps<typeof Collapsible>;

export const QueueSection = ({ className, defaultOpen = true, ...props }: QueueSectionProps) => (
  <Collapsible className={cn(className)} defaultOpen={defaultOpen} {...props} />
);

// QueueSectionTrigger - section header/trigger
export type QueueSectionTriggerProps = ComponentProps<"button">;

export const QueueSectionTrigger = ({
  children,
  className,
  ...props
}: QueueSectionTriggerProps) => (
  <CollapsibleTrigger
    render={
      <button
        className={cn(
          "group flex w-full items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-start text-sm font-medium text-muted-foreground transition-colors hover:bg-muted",
          className,
        )}
        type="button"
        {...props}
      />
    }
  >
    {children}
  </CollapsibleTrigger>
);

// QueueSectionLabel - label content with icon and count
export type QueueSectionLabelProps = ComponentProps<"span"> & {
  readonly count?: number;
  readonly label: string;
  readonly icon?: React.ReactNode;
};

export const QueueSectionLabel = ({
  count,
  label,
  icon,
  className,
  ...props
}: QueueSectionLabelProps) => (
  <span className={cn("flex items-center gap-2", className)} {...props}>
    <ChevronDownIcon className="size-4 transition-transform group-data-[state=closed]:-rotate-90" />
    {icon}
    <span>
      {count} {label}
    </span>
  </span>
);

// QueueSectionContent - collapsible content area
export type QueueSectionContentProps = ComponentProps<typeof CollapsibleContent>;

export const QueueSectionContent = ({ className, ...props }: QueueSectionContentProps) => (
  <CollapsibleContent className={cn(className)} {...props} />
);

export type QueueProps = ComponentProps<"div">;

export const Queue = ({ className, ...props }: QueueProps) => (
  <div
    className={cn(
      "flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-xs",
      className,
    )}
    {...props}
  />
);
