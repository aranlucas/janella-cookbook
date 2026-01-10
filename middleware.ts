import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Don't redirect if locale is in path
  localePrefix: "as-needed",
});

export const config = {
  // Match only internationalized pathnames
  // Skip API routes, static files, and images
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/",
    "/(en|es|fr|de|it|pt|ja|ko|zh)/:path*",
  ],
};
