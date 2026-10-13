"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type {
  DefaultLegendContentProps,
  LegendPayload,
  TooltipContentProps,
  TooltipPayloadEntry,
  TooltipValueType,
} from "recharts";
import { z } from "zod";

import { jsonValueSchema, readJsonObject, readJsonString } from "@/lib/json";
import { cn } from "@/lib/utils";
import type { JsonValue } from "@/types/json";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

const THEME_NAMES = ["light", "dark"] as const;

export type ChartConfig = Record<
  string,
  {
    readonly label?: React.ReactNode;
    readonly icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

type ChartContainerProps = React.ComponentProps<"div"> & {
  readonly config: ChartConfig;
  readonly children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
};

type ChartStyleProps = { readonly id: string; readonly config: ChartConfig };

type ChartTooltipPayload = TooltipPayloadEntry<TooltipValueType, string | number>;

type ChartTooltipContentProps = Omit<
  TooltipContentProps<TooltipValueType, string | number>,
  "payload"
> &
  React.ComponentProps<"div"> & {
    readonly payload?: readonly ChartTooltipPayload[];
    readonly hideLabel?: boolean;
    readonly hideIndicator?: boolean;
    readonly indicator?: "line" | "dot" | "dashed";
    readonly nameKey?: string;
    readonly labelKey?: string;
    readonly color?: string;
  };

type ChartLegendContentProps = React.ComponentProps<"div"> & {
  readonly hideIcon?: boolean;
  readonly nameKey?: string;
  readonly payload?: ReadonlyArray<LegendPayload>;
} & DefaultLegendContentProps;

interface ChartContextProps {
  readonly config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({ id, className, children, config, ...props }: ChartContainerProps) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: Readonly<ChartStyleProps>) => {
  const colorConfig = Object.entries(config).filter(
    ([, chartConfig]) => chartConfig.theme ?? chartConfig.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: THEME_NAMES.map(
          (theme) => `
${THEMES[theme]} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme] ?? itemConfig.color;

    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
        ).join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  payload,
  label,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = String(labelKey ?? item?.dataKey ?? item?.name ?? "value");
    const parsedPayload = parseChartPayload(item);

    const itemConfig = parsedPayload
      ? getPayloadConfigFromPayload(config, parsedPayload, key)
      : null;

    const parsedLabel = z.string().safeParse(label);

    const value =
      !labelKey && parsedLabel.success
        ? (config[parsedLabel.data]?.label ?? parsedLabel.data)
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [config, hideLabel, label, labelClassName, labelFormatter, labelKey, payload]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(nameKey ?? item.name ?? item.dataKey ?? "value");
          const parsedPayload = parseChartPayload(item);

          const itemConfig = parsedPayload
            ? getPayloadConfigFromPayload(config, parsedPayload, key)
            : null;

          const indicatorColor = color ?? item.fill ?? item.color;

          return (
            <div
              key={String(item.dataKey ?? item.name ?? item.value ?? "tooltip-item")}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center",
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn("shrink-0 rounded-xs border-border", {
                          "size-2.5": indicator === "dot",
                          "w-1": indicator === "line",
                          "w-0 border-2 border-dashed bg-transparent": indicator === "dashed",
                          "my-0.5": nestLabel && indicator === "dashed",
                        })}
                        style={
                          // SAFETY: recharts uses this custom property as the chart indicator border color.
                          {
                            "--color-border": indicatorColor,
                            backgroundColor:
                              indicator === "dashed" ? "transparent" : indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label ?? item.name}
                      </span>
                    </div>
                    {item.value != null && (
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {(() => {
                          const numberValue = z.number().safeParse(item.value);
                          const stringValue = z.string().safeParse(item.value);

                          return numberValue.success
                            ? numberValue.data.toLocaleString()
                            : stringValue.success
                              ? stringValue.data
                              : "";
                        })()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  nameKey,
  payload,
  verticalAlign,
}: ChartLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pbe-3" : "pbs-3",
        className,
      )}
    >
      {payload.map((item) => {
        const key = String(nameKey ?? item.dataKey ?? "value");
        const parsedPayload = parseChartPayload(item);

        const itemConfig = parsedPayload
          ? getPayloadConfigFromPayload(config, parsedPayload, key)
          : null;

        return (
          <div
            key={item.value}
            className={cn("flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-muted-foreground")}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="size-2 shrink-0 rounded-xs"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

// Helper to extract item config from a payload.
function parseChartPayload(
  value: Readonly<ChartTooltipPayload | LegendPayload>,
): JsonValue | undefined {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    return undefined;
  }

  const parsed = jsonValueSchema.safeParse(JSON.parse(serialized));

  return parsed.success ? parsed.data : undefined;
}

function getPayloadConfigFromPayload(
  config: Readonly<ChartConfig>,
  payload: JsonValue,
  key: string,
) {
  const payloadObject = readJsonObject(payload);

  if (!payloadObject) {
    return null;
  }

  const nestedPayload = readJsonObject(payloadObject.payload ?? null);

  const configLabelKey =
    readJsonString(payloadObject[key] ?? null) ??
    (nestedPayload ? readJsonString(nestedPayload[key] ?? null) : undefined) ??
    key;

  return configLabelKey in config ? config[configLabelKey] : config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
