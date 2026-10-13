"use client";

import type { ComponentProps, HTMLAttributes } from "react";
import type { BundledLanguage, BundledTheme, HighlighterGeneric, ThemedToken } from "shiki";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toError } from "@/lib/error-utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createHighlighter } from "shiki";

// Shiki uses bitflags for font styles: 1=italic, 2=bold, 4=underline
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
const isItalic = (fontStyle: number | undefined) => fontStyle && fontStyle & 1;

// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
const isBold = (fontStyle: number | undefined) => fontStyle && fontStyle & 2;

const isUnderline = (fontStyle: number | undefined) =>
  // biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
  fontStyle && fontStyle & 4;

// Transform tokens to include pre-computed keys to avoid noArrayIndexKey lint
interface KeyedToken {
  token: ThemedToken;
  key: string;
}

interface KeyedLine {
  tokens: KeyedToken[];
  key: string;
}

const addKeysToTokens = (lines: readonly (readonly ThemedToken[])[]): KeyedLine[] =>
  lines.map((line, lineIdx) => ({
    key: `line-${lineIdx}`,
    tokens: line.map((token, tokenIdx) => ({
      key: `line-${lineIdx}-${tokenIdx}`,
      token,
    })),
  }));

// Token rendering component
// Shiki emits the light colour inline and the dark colour as a CSS variable.
// We resolve both through `light-dark()` so the `color-scheme` set on the
// surrounding `<pre>` (see CodeBlockBody) selects the active theme.
interface TokenSpanProps {
  readonly token: ThemedToken;
}

const TokenSpan = ({ token }: Readonly<TokenSpanProps>) => {
  const {
    color,
    "background-color": backgroundColor,
    "--shiki-dark": darkColor,
    "--shiki-dark-bg": darkBackgroundColor,
    ...htmlStyle
  } = token.htmlStyle ?? {};

  const lightColor = color ?? token.color;
  const lightBackgroundColor = backgroundColor ?? token.bgColor;

  return (
    <span
      style={{
        ...htmlStyle,
        backgroundColor: darkBackgroundColor
          ? `light-dark(${lightBackgroundColor ?? "transparent"}, ${darkBackgroundColor})`
          : lightBackgroundColor,
        color: darkColor ? `light-dark(${lightColor ?? "currentColor"}, ${darkColor})` : lightColor,
        fontStyle: isItalic(token.fontStyle) ? "italic" : undefined,
        fontWeight: isBold(token.fontStyle) ? "bold" : undefined,
        textDecoration: isUnderline(token.fontStyle) ? "underline" : undefined,
      }}
    >
      {token.content}
    </span>
  );
};

// Line rendering component
interface LineSpanProps {
  readonly keyedLine: KeyedLine;
  readonly lineNumber: number;
  readonly showLineNumbers: boolean;
}

const LineSpan = ({ keyedLine, lineNumber, showLineNumbers }: Readonly<LineSpanProps>) => (
  <span className="block">
    {showLineNumbers ? <span className={LINE_NUMBER_CLASSES}>{lineNumber}</span> : null}
    {keyedLine.tokens.length === 0
      ? "\n"
      : keyedLine.tokens.map(({ token, key }) => <TokenSpan key={key} token={token} />)}
  </span>
);

// Types
type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  readonly code: string;
  readonly language: BundledLanguage;
  readonly showLineNumbers?: boolean;
};

interface TokenizedCode {
  tokens: ThemedToken[][];
  fg: string;
  bg: string;
}

interface CodeBlockContextType {
  code: string;
}

// Context
const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

// Highlighter cache (singleton per language)
const highlighterCache = new Map<
  string,
  Promise<HighlighterGeneric<BundledLanguage, BundledTheme>>
>();

// Token cache
const tokensCache = new Map<string, TokenizedCode>();

// Subscribers for async token updates
const subscribers = new Map<string, Set<(result: Readonly<TokenizedCode>) => void>>();

const getTokensCacheKey = (code: string, language: BundledLanguage) => {
  const start = code.slice(0, 100);
  const end = code.length > 100 ? code.slice(-100) : "";

  return `${language}:${code.length}:${start}:${end}`;
};

const getHighlighter = (
  language: BundledLanguage,
): Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> => {
  const cached = highlighterCache.get(language);

  if (cached) {
    return cached;
  }

  const highlighterPromise = createHighlighter({
    langs: [language],
    themes: ["github-light", "github-dark"],
  });

  highlighterCache.set(language, highlighterPromise);

  return highlighterPromise;
};

// Create raw tokens for immediate display while highlighting loads
const createRawTokens = (code: string): TokenizedCode => ({
  bg: "transparent",
  fg: "inherit",
  tokens: code.split("\n").map((line) =>
    line === ""
      ? []
      : [
          // SAFETY: Shiki's ThemedToken accepts a color and source line for unhighlighted fallback text.
          {
            color: "inherit",
            content: line,
          } as ThemedToken,
        ],
  ),
});

// Synchronous highlight with callback for async results
const highlightCode = (
  code: string,
  language: BundledLanguage,
  callback?: (result: Readonly<TokenizedCode>) => void,
): TokenizedCode | null => {
  const tokensCacheKey = getTokensCacheKey(code, language);

  // Return cached result if available
  const cached = tokensCache.get(tokensCacheKey);

  if (cached) {
    return cached;
  }

  // Subscribe callback if provided
  if (callback) {
    if (!subscribers.has(tokensCacheKey)) {
      subscribers.set(tokensCacheKey, new Set());
    }

    subscribers.get(tokensCacheKey)?.add(callback);
  }

  // Start highlighting in background - fire-and-forget async pattern
  getHighlighter(language)
    .then((highlighter) => {
      const availableLangs = highlighter.getLoadedLanguages();
      const langToUse = availableLangs.includes(language) ? language : "text";

      const result = highlighter.codeToTokens(code, {
        lang: langToUse,
        themes: {
          dark: "github-dark",
          light: "github-light",
        },
      });

      const tokenized: TokenizedCode = {
        bg: result.bg ?? "transparent",
        fg: result.fg ?? "inherit",
        tokens: result.tokens,
      };

      // Cache the result
      tokensCache.set(tokensCacheKey, tokenized);

      // Notify all subscribers
      const subs = subscribers.get(tokensCacheKey);

      if (subs) {
        for (const sub of subs) {
          sub(tokenized);
        }

        subscribers.delete(tokensCacheKey);
      }

      return tokenized;
    })
    .catch((error) => {
      console.error("Failed to highlight code:", error);
      subscribers.delete(tokensCacheKey);
    });

  return null;
};

// Reads a single declaration out of a shiki-generated style string such as
// `"#fff;--shiki-dark-bg:#24292e"`.
const shikiStyleValue = (style: string, property: string): string | undefined =>
  style
    .split(";")
    .map((declaration) => declaration.split(":"))
    .find(([name]) => name?.trim() === property)?.[1]
    ?.trim();

// Line number styles
const LINE_NUMBER_CLASSES = cn(
  "inline-block w-8",
  "me-4",
  "text-end",
  "text-muted-foreground/50",
  "font-mono",
  "select-none",
);

interface CodeBlockBodyProps {
  readonly tokenized: TokenizedCode;
  readonly showLineNumbers: boolean;
  readonly className?: string;
}

const CodeBlockBody = memo(
  ({ tokenized, showLineNumbers, className }: Readonly<CodeBlockBodyProps>) => {
    const preStyle = useMemo(() => {
      const darkBackgroundColor = shikiStyleValue(tokenized.bg, "--shiki-dark-bg");
      const darkColor = shikiStyleValue(tokenized.fg, "--shiki-dark");

      return {
        backgroundColor: darkBackgroundColor
          ? `light-dark(transparent, ${darkBackgroundColor})`
          : tokenized.bg,
        color: darkColor ? `light-dark(currentColor, ${darkColor})` : tokenized.fg,
      };
    }, [tokenized.bg, tokenized.fg]);

    const keyedLines = useMemo(() => addKeysToTokens(tokenized.tokens), [tokenized.tokens]);

    return (
      <pre
        className={cn("m-0 p-4 text-sm scheme-light dark:scheme-dark", className)}
        style={preStyle}
      >
        <code className="font-mono text-sm">
          {keyedLines.map((keyedLine, lineIndex) => (
            <LineSpan
              key={keyedLine.key}
              keyedLine={keyedLine}
              lineNumber={lineIndex + 1}
              showLineNumbers={showLineNumbers}
            />
          ))}
        </code>
      </pre>
    );
  },
  (prevProps, nextProps) =>
    prevProps.tokenized === nextProps.tokenized &&
    prevProps.showLineNumbers === nextProps.showLineNumbers &&
    prevProps.className === nextProps.className,
);

CodeBlockBody.displayName = "CodeBlockBody";

type CodeBlockContainerProps = HTMLAttributes<HTMLDivElement> & {
  readonly language: string;
};

export const CodeBlockContainer = ({
  className,
  language,
  style,
  ...props
}: CodeBlockContainerProps) => (
  <div
    className={cn(
      "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
      className,
    )}
    data-language={language}
    style={{
      containIntrinsicSize: "auto 200px",
      contentVisibility: "auto",
      ...style,
    }}
    {...props}
  />
);

export const CodeBlockHeader = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-between border-be bg-muted/80 px-3 py-2 text-xs text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const CodeBlockTitle = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

export const CodeBlockFilename = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("font-mono", className)} {...props}>
    {children}
  </span>
);

export const CodeBlockActions = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("-my-1 -me-1 flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

interface CodeBlockContentProps {
  readonly code: string;
  readonly language: BundledLanguage;
  readonly showLineNumbers?: boolean;
}

export const CodeBlockContent = ({
  code,
  language,
  showLineNumbers = false,
}: CodeBlockContentProps) => {
  // Memoized raw tokens for immediate display
  const rawTokens = useMemo(() => createRawTokens(code), [code]);

  const [tokenizedState, setTokenizedState] = useState(() => ({
    code,
    language,
    tokens: highlightCode(code, language) ?? rawTokens,
  }));

  const tokenized =
    tokenizedState.code === code && tokenizedState.language === language
      ? tokenizedState.tokens
      : rawTokens;

  useEffect(() => {
    let cancelled = false;

    // Subscribe to async highlighting result
    highlightCode(code, language, (result) => {
      if (!cancelled) {
        setTokenizedState({ code, language, tokens: result });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, language, rawTokens]);

  return (
    <div className="relative overflow-auto">
      <CodeBlockBody showLineNumbers={showLineNumbers} tokenized={tokenized} />
    </div>
  );
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const contextValue = useMemo(() => ({ code }), [code]);

  return (
    <CodeBlockContext.Provider value={contextValue}>
      <CodeBlockContainer className={className} language={language} {...props}>
        {children}
        <CodeBlockContent code={code} language={language} showLineNumbers={showLineNumbers} />
      </CodeBlockContainer>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  readonly onCopy?: () => void;
  readonly onError?: (error: Error) => void;
  readonly timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { code } = useContext(CodeBlockContext);

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
    <Button
      className={cn("shrink-0", className)}
      onClick={() => {
        copyToClipboard().catch(() => {});
      }}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};

export type CodeBlockLanguageSelectorProps = ComponentProps<typeof Select>;

export const CodeBlockLanguageSelector = (props: CodeBlockLanguageSelectorProps) => (
  <Select {...props} />
);

export type CodeBlockLanguageSelectorTriggerProps = ComponentProps<typeof SelectTrigger>;

export const CodeBlockLanguageSelectorTrigger = ({
  className,
  ...props
}: CodeBlockLanguageSelectorTriggerProps) => (
  <SelectTrigger
    className={cn("h-7 border-none bg-transparent px-2 text-xs shadow-none", className)}
    size="sm"
    {...props}
  />
);

export type CodeBlockLanguageSelectorValueProps = ComponentProps<typeof SelectValue>;

export const CodeBlockLanguageSelectorValue = (props: CodeBlockLanguageSelectorValueProps) => (
  <SelectValue {...props} />
);

export type CodeBlockLanguageSelectorContentProps = ComponentProps<typeof SelectContent>;

export const CodeBlockLanguageSelectorContent = ({
  align = "end",
  ...props
}: CodeBlockLanguageSelectorContentProps) => <SelectContent align={align} {...props} />;

export type CodeBlockLanguageSelectorItemProps = ComponentProps<typeof SelectItem>;

export const CodeBlockLanguageSelectorItem = (props: CodeBlockLanguageSelectorItemProps) => (
  <SelectItem {...props} />
);
