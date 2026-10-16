import type { Metadata } from "next";
import { env } from "./env";

const SITE_NAME = "Janella Cookbook";

const DEFAULT_TITLE = "Cookbook - Your Personal Recipe Collection";

const DEFAULT_DESCRIPTION =
  "A modern cookbook app to collect, organize, and discover recipes with intelligent semantic search.";

const DEFAULT_OG_IMAGE = "/opengraph-image";

interface CreatePageMetadataOptions {
  readonly title?: string;
  readonly description?: string;
  readonly path?: string;
  readonly image?: string;
  readonly noIndex?: boolean;
}

function toAbsoluteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return `/${value}`;
}

function normalizeSiteUrl(url: string): string {
  const trimmed = url.trim();

  if (!trimmed) {
    return "http://localhost:3000";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getSiteUrl(): string {
  const envSiteUrl =
    env.NEXT_PUBLIC_SITE_URL ??
    env.NEXT_PUBLIC_APP_URL ??
    env.SITE_URL ??
    env.APP_URL ??
    env.RAILWAY_PUBLIC_DOMAIN ??
    env.VERCEL_URL;

  return normalizeSiteUrl(envSiteUrl ?? "http://localhost:3000");
}

const metadataBase = new URL(getSiteUrl());

export function createPageMetadata(options: CreatePageMetadataOptions = {}): Metadata {
  const title = options.title ?? DEFAULT_TITLE;
  const description = options.description ?? DEFAULT_DESCRIPTION;
  const image = toAbsoluteUrl(options.image ?? DEFAULT_OG_IMAGE);
  const path = options.path ?? "/";

  return {
    metadataBase,
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: options.noIndex ? { index: false, follow: false } : undefined,
  };
}
