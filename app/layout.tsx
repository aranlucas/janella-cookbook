import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cookbook - Your Personal Recipe Collection",
  description: "A modern cookbook app to collect, organize, and discover recipes with intelligent semantic search.",
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
        className={`${playfair.variable} ${sourceSans.variable} font-sans antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
