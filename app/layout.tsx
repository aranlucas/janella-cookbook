import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { createPageMetadata } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Cookbook - Your Personal Recipe Collection",
    description:
      "A modern cookbook app to collect, organize, and discover recipes with intelligent semantic search.",
    path: "/",
  }),
  keywords: ["cookbook", "recipes", "cooking", "meal planning", "food"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SessionProvider>{children}</SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
