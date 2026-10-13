"use client";

import * as React from "react";
import { z } from "zod";

type SetStateAction<T> = T | ((prevState: T) => T);

type UseControllableStateParams<T> = {
  prop?: T;
  defaultProp?: T;
  onChange?: (state: T) => void;
};

type UseControllableStateReturn<T> = [T, (nextState: SetStateAction<T>) => void];

function stateUpdaterSchema<T>() {
  return z.function({ input: [z.custom<T>()], output: z.custom<T>() });
}

export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: Readonly<UseControllableStateParams<T>>): UseControllableStateReturn<T> {
  const [uncontrolledState, setUncontrolledState] = React.useState<T | undefined>(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledState;
  const onChangeRef = React.useRef(onChange);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setValue = React.useCallback(
    (nextState: SetStateAction<T>) => {
      const updater = stateUpdaterSchema<T>().safeParse(nextState);

      const resolveValue = (previousValue: T | undefined): T => {
        if (updater.success) {
          // SAFETY: React supplies the current state; undefined is valid only when included in T.
          const previousState = previousValue as T;

          return updater.data(previousState);
        }

        // SAFETY: A non-function state action is the value branch of SetStateAction<T>.
        return nextState as T;
      };

      if (isControlled) {
        const nextValue = resolveValue(prop);

        if (!Object.is(nextValue, prop)) {
          onChangeRef.current?.(nextValue);
        }

        return;
      }

      setUncontrolledState((previousValue) => {
        const nextValue = resolveValue(previousValue);

        if (!Object.is(nextValue, previousValue)) {
          onChangeRef.current?.(nextValue);
        }

        return nextValue;
      });
    },
    [isControlled, prop],
  );

  // SAFETY: controlled callers provide prop and uncontrolled callers initialize state from defaultProp.
  return [value as T, setValue];
}
