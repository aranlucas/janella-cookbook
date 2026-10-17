import type { IngredientInput } from "@/types/recipe";

const NUMBER = String.raw`(?:\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?\s*[½⅓⅔¼¾⅛⅜⅝⅞]?|[½⅓⅔¼¾⅛⅜⅝⅞])`;

/** "1 1/2 cups flour, sifted" → quantity, optional "(14 oz)" size, unit, rest. */
const LINE = new RegExp(
  String.raw`^(${NUMBER}(?:\s*(?:-|–|to)\s*${NUMBER})?)\s*(\([^()]+\)\s*)?` +
    String.raw`(?:((?:fl\.?\s*)?(?:oz|ounces?|cups?|c|tbsps?|tbs|tbl|tablespoons?|t|tsps?|teaspoons?|lbs?|pounds?|g|grams?|kg|kilograms?|mg|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|cl|dl|pints?|pt|quarts?|qt|gallons?|gal|cloves?|cans?|jars?|bottles?|bags?|box(?:es)?|packages?|pkg|packets?|envelopes?|sticks?|slices?|sheets?|sprigs?|stalks?|heads?|bunch(?:es)?|handfuls?|pinch(?:es)?|dash(?:es)?|drops?))\.?(?:\s+of)?(?=\s|$)\s*)?(.+)$`,
  "i",
);

/** Split "name, notes" at the first top-level comma, or a trailing "(notes)". */
function splitNotes(text: string): Pick<IngredientInput, "name" | "notes"> {
  const match =
    text.match(/^((?:[^,(]|\([^)]*\))+?),\s*(.+)$/) ?? text.match(/^(.+?)\s*\(([^()]+)\)$/);

  return match ? { name: match[1].trim(), notes: match[2].trim() } : { name: text };
}

/**
 * Best-effort split of a written ingredient line into fields. Anything not
 * recognised stays in `name`, so no text is lost.
 */
export function parseIngredientLine(line: string): IngredientInput {
  const text = line.replaceAll(/\s+/g, " ").trim();
  const match = text.match(LINE);

  // "12-ounce bag" describes a size, not a count; leave it whole.
  if (!match || match[4].startsWith("-")) {
    return splitNotes(text);
  }

  const [, quantity, size, unit, rest] = match;

  return {
    quantity: quantity.trim(),
    unit: unit ? [size?.trim(), unit].filter(Boolean).join(" ") : undefined,
    ...splitNotes(unit || !size ? rest : `${size.trim()} ${rest}`),
  };
}
