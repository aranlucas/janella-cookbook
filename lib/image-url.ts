const IMAGE_PROXY_PATH = "/api/images/proxy";

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Normalize user/imported image URLs into a safe absolute URL.
 * Supports protocol-relative URLs and only allows HTTP(S).
 */
export function normalizeRecipeImageUrl(
  input: string | null | undefined,
): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
  const parsed = tryParseUrl(normalized);
  if (!parsed) return null;

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }

  return parsed.toString();
}

function toHttpsUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol === "http:") {
    parsed.protocol = "https:";
  }
  return parsed.toString();
}

function toProxyUrl(url: string): string {
  return `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

/**
 * Build ordered candidates for browser rendering:
 * 1) Prefer direct HTTPS when possible.
 * 2) Fallback to server-side proxy (handles mixed-content and hotlink issues).
 */
export function buildRecipeImageCandidates(
  input: string | null | undefined,
): string[] {
  const normalized = normalizeRecipeImageUrl(input);
  if (!normalized) return [];

  const candidates = new Set<string>();
  const parsed = new URL(normalized);

  if (parsed.protocol === "http:") {
    candidates.add(toHttpsUrl(normalized));
    candidates.add(toProxyUrl(normalized));
    return Array.from(candidates);
  }

  candidates.add(normalized);
  candidates.add(toProxyUrl(normalized));

  return Array.from(candidates);
}
