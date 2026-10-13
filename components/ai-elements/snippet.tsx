"use client";

import type { ComponentProps } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { toError } from "@/lib/error-utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface SnippetContextType {
  code: string;
}

const SnippetContext = createContext<SnippetContextType>({
  code: "",
});

export type SnippetProps = ComponentProps<typeof InputGroup> & {
  readonly code: string;
};

export const Snippet = ({ code, className, children, ...props }: SnippetProps) => (
  <SnippetContext.Provider value={{ code }}>
    <InputGroup className={cn("font-mono", className)} {...props}>
      {children}
    </InputGroup>
  </SnippetContext.Provider>
);

export type SnippetAddonProps = ComponentProps<typeof InputGroupAddon>;

export const SnippetAddon = (props: SnippetAddonProps) => <InputGroupAddon {...props} />;

export type SnippetTextProps = ComponentProps<typeof InputGroupText>;

export const SnippetText = ({ className, ...props }: SnippetTextProps) => (
  <InputGroupText className={cn("ps-2 font-normal text-muted-foreground", className)} {...props} />
);

export type SnippetInputProps = Omit<ComponentProps<typeof InputGroupInput>, "readOnly" | "value">;

export const SnippetInput = ({
  className,
  ...props
}: Readonly<Omit<ComponentProps<typeof InputGroupInput>, "readOnly" | "value">>) => {
  const { code } = useContext(SnippetContext);

  return (
    <InputGroupInput
      className={cn("text-foreground", className)}
      readOnly
      value={code}
      {...props}
    />
  );
};

export type SnippetCopyButtonProps = ComponentProps<typeof InputGroupButton> & {
  readonly onCopy?: () => void;
  readonly onError?: (error: Error) => void;
  readonly timeout?: number;
};

export const SnippetCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: Readonly<SnippetCopyButtonProps>) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { code } = useContext(SnippetContext);

  const copyToClipboard = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));

      return;
    }

    try {
      if (!isCopied) {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        onCopy?.();
        timeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout);
      }
    } catch (error) {
      onError?.(toError(error));
    }
  }, [code, onCopy, onError, timeout, isCopied]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <InputGroupButton
      aria-label="Copy"
      className={className}
      onClick={() => {
        copyToClipboard().catch(() => {});
      }}
      size="icon-sm"
      title="Copy"
      {...props}
    >
      {children ?? <Icon className="size-3.5" size={14} />}
    </InputGroupButton>
  );
};
