import { load } from "cheerio";

const ENTITY = /&(?:#\d+|#x[\da-f]+|[a-z]+);/i;

/**
 * Turn scraped text into plain text: strip tags, decode entities (sites often
 * double-encode, e.g. `&amp;#39;`) and collapse whitespace.
 */
export function cleanText(value: string): string {
  let text = value;

  for (let pass = 0; pass < 2 && (text.includes("<") || ENTITY.test(text)); pass++) {
    text = load(text, null, false).text();
  }

  return text.replaceAll(/\s+/g, " ").trim();
}

/** Shorten text to fit a validation limit without cutting mid-word where possible. */
export function clip(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");

  return `${(space > max * 0.8 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
