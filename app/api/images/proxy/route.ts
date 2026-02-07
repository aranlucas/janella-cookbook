import dns from "node:dns/promises";
import net from "node:net";
import { NextRequest, NextResponse } from "next/server";

const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 12_000;
const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  );
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.replace("::ffff:", ""));
  }

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateAddress(address: string): boolean {
  const ipType = net.isIP(address);
  if (ipType === 4) return isPrivateIpv4(address);
  if (ipType === 6) return isPrivateIpv6(address);
  return true;
}

async function isSafeTarget(url: URL): Promise<boolean> {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  if (isLocalHostname(url.hostname)) return false;

  const ipType = net.isIP(url.hostname);
  if (ipType !== 0) {
    return !isPrivateAddress(url.hostname);
  }

  try {
    const resolved = await dns.lookup(url.hostname, { all: true });
    if (resolved.length === 0) return false;
    return resolved.every((entry) => !isPrivateAddress(entry.address));
  } catch {
    return false;
  }
}

async function fetchImage(
  url: URL,
  redirectCount: number = 0,
): Promise<Response> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error("Too many redirects");
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: "image/*,*/*;q=0.8",
      "User-Agent": "JanellaCookbookImageProxy/1.0",
    },
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Redirect without location");
    }

    const nextUrl = new URL(location, url);
    if (!(await isSafeTarget(nextUrl))) {
      throw new Error("Blocked redirect target");
    }

    return fetchImage(nextUrl, redirectCount + 1);
  }

  return response;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (!(await isSafeTarget(targetUrl))) {
    return new NextResponse("Blocked URL", { status: 400 });
  }

  try {
    const upstream = await fetchImage(targetUrl);

    if (!upstream.ok) {
      return new NextResponse("Unable to fetch image", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type");
    if (!contentType || !contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("URL is not an image", { status: 415 });
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", CACHE_CONTROL);
    headers.set("X-Content-Type-Options", "nosniff");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Image proxy failed:", error);
    return new NextResponse("Image fetch failed", { status: 502 });
  }
}
