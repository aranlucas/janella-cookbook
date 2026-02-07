"use client";

import * as React from "react";

type SetStateAction<T> = T | ((prevState: T) => T);

type UseControllableStateParams<T> = {
  prop?: T;
  defaultProp?: T;
  onChange?: (state: T) => void;
};

export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>): [T, (nextState: SetStateAction<T>) => void] {
  const [uncontrolledState, setUncontrolledState] = React.useState<
    T | undefined
  >(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledState;
  const onChangeRef = React.useRef(onChange);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setValue = React.useCallback(
    (nextState: SetStateAction<T>) => {
      const resolveValue = (previousValue: T | undefined): T =>
        typeof nextState === "function"
          ? (nextState as (prevState: T) => T)(previousValue as T)
          : nextState;

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

  return [value as T, setValue];
}
