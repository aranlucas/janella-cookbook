import type { IngredientInput } from "@/types/recipe";

const FRACTION = "[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]";

const NUMBER = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?\\s*${FRACTION}?|${FRACTION})`;

const QUANTITY = new RegExp(`^(${NUMBER}(?:\\s*(?:-|–|to)\\s*${NUMBER})?)\\s*`, "i");

const UNITS = new Set([
  "bag",
  "bags",
  "bottle",
  "bottles",
  "box",
  "boxes",
  "bunch",
  "bunches",
  "c",
  "can",
  "cans",
  "cl",
  "clove",
  "cloves",
  "cup",
  "cups",
  "dash",
  "dashes",
  "dl",
  "drop",
  "drops",
  "envelope",
  "envelopes",
  "fl oz",
  "g",
  "gal",
  "gallon",
  "gallons",
  "gram",
  "grams",
  "handful",
  "handfuls",
  "head",
  "heads",
  "jar",
  "jars",
  "kg",
  "kilogram",
  "kilograms",
  "l",
  "lb",
  "lbs",
  "liter",
  "liters",
  "litre",
  "litres",
  "mg",
  "milliliter",
  "milliliters",
  "millilitre",
  "millilitres",
  "ml",
  "ounce",
  "ounces",
  "oz",
  "package",
  "packages",
  "packet",
  "packets",
  "pinch",
  "pinches",
  "pint",
  "pints",
  "pkg",
  "pound",
  "pounds",
  "pt",
  "qt",
  "quart",
  "quarts",
  "sheet",
  "sheets",
  "slice",
  "slices",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
  "stick",
  "sticks",
  "t",
  "tablespoon",
  "tablespoons",
  "tbl",
  "tbs",
  "tbsp",
  "tbsps",
  "teaspoon",
  "teaspoons",
  "tsp",
  "tsps",
]);

interface UnitMatch {
  readonly unit: string;
  readonly rest: string;
}

interface NameAndNotes {
  readonly name: string;
  readonly notes?: string;
}

/** Leading unit, allowing "fl. oz.", "Tbsp." and an optional "of". */
function readUnit(text: string): UnitMatch | undefined {
  const match = text.match(/^((?:fl\.?\s+)?[a-z]+)\.?(?:\s+of)?(?:\s+|$)/i);

  if (!match) {
    return undefined;
  }

  const key = match[1].toLowerCase().replaceAll(/\.\s*|\s+/g, " ");

  return UNITS.has(key) ? { unit: match[1], rest: text.slice(match[0].length) } : undefined;
}

/** Split "name, notes" at the first comma outside parentheses. */
function splitNotes(text: string): NameAndNotes {
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (char === "," && depth === 0) {
      const name = text.slice(0, i).trim();
      const notes = text.slice(i + 1).trim();

      if (name && notes) {
        return { name, notes };
      }
    }
  }

  const trailing = text.match(/^(.+?)\s*\(([^()]+)\)$/);

  return trailing ? { name: trailing[1], notes: trailing[2] } : { name: text };
}

/**
 * Best-effort split of a written ingredient line ("1 1/2 cups flour, sifted")
 * into fields. Anything not recognised stays in `name`, so no text is lost.
 */
export function parseIngredientLine(line: string): IngredientInput {
  const text = line.replaceAll(/\s+/g, " ").trim();
  const quantity = text.match(QUANTITY);

  // "12-ounce bag" describes a size, not a count; leave it whole.
  if (!quantity || /^[-–]/.test(text.slice(quantity[0].length))) {
    return splitNotes(text);
  }

  let rest = text.slice(quantity[0].length);
  // Package sizes such as "1 (14 oz) can tomatoes" belong with the unit.
  const size = rest.match(/^\([^()]+\)\s*/);

  if (size) {
    rest = rest.slice(size[0].length);
  }

  const unit = readUnit(rest);
  const sizeText = size?.[0].trim();
  const body = splitNotes(unit ? unit.rest : rest);

  if (!body.name) {
    return splitNotes(text);
  }

  return {
    quantity: quantity[1].trim(),
    unit: unit ? [sizeText, unit.unit].filter(Boolean).join(" ") : undefined,
    ...(unit || !sizeText ? body : { ...body, name: `${sizeText} ${body.name}` }),
  };
}
