import { z } from "zod";
import type { JsonObject, JsonValue } from "@/types/json";

export const jsonValueSchema = z.json();

const jsonStringSchema = z.string();

const jsonNumberSchema = z.number();

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export function readJsonString(value: JsonValue): string | undefined {
  const parsed = jsonStringSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

export function readJsonNumber(value: JsonValue): number | undefined {
  const parsed = jsonNumberSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

export function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
}

export function readJsonObject(value: JsonValue): JsonObject | undefined {
  const parsed = jsonObjectSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}
