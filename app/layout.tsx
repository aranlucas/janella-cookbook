import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { createPageMetadata } from "@/lib/metadata";
import "./globals.css";

// Self-hosted so builds never depend on the Google Fonts API, and preloaded
// with metric-matched fallbacks so the display type doesn't jump on load.
const fraunces = localFont({
  src: [
    { path: "./fonts/Fraunces-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/Fraunces-Italic-Variable.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const outfit = localFont({
  src: "./fonts/Outfit-Variable.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
});

type RootLayoutProps = Readonly<{ readonly children: React.ReactNode }>;

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Cookbook - Your Personal Recipe Collection",
    description:
      "A modern cookbook app to collect, organize, and discover recipes with intelligent semantic search.",
    path: "/",
  }),
  keywords: ["cookbook", "recipes", "cooking", "meal planning", "food"],
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${fraunces.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased">
        <SessionProvider>{children}</SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
