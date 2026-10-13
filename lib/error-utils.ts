export function toError<Value>(value: Value): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function isAbortError<Value>(value: Value): boolean {
  return value instanceof Error && value.name === "AbortError";
}
