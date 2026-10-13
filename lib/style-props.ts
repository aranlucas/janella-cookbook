import type { CSSProperties } from "react";
import { z } from "zod";

type StyleProp<State> = CSSProperties | ((state: State) => CSSProperties | undefined) | undefined;

function readStyleCallback<State>(style: StyleProp<State>) {
  const parsed = z
    .function({
      input: [z.custom<State>()],
      output: z.custom<CSSProperties | undefined>(),
    })
    .safeParse(style);

  return parsed.success ? parsed.data : undefined;
}

export function mergeStyleProps<State>(
  defaults: CSSProperties,
  style: StyleProp<State>,
): StyleProp<State> {
  const callback = readStyleCallback(style);

  if (callback) {
    return (state) => ({ ...defaults, ...callback(state) });
  }

  // SAFETY: the callback schema handled functions; this branch contains only CSS properties or undefined.
  const objectStyle = style as CSSProperties | undefined;

  return { ...defaults, ...objectStyle };
}
