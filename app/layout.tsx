import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Fallback to system fonts when Google Fonts is not accessible
const fontVariables = {
  "--font-heading":
    "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  "--font-body":
    "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
};

export const metadata: Metadata = {
  title: "Cookbook - Your Personal Recipe Collection",
  description:
    "A modern cookbook app to collect, organize, and discover recipes with intelligent semantic search.",
  keywords: ["cookbook", "recipes", "cooking", "meal planning", "food"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased"
        style={fontVariables as React.CSSProperties}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
